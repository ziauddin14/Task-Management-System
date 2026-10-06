import React from 'react'; // explicit import — see src/App.jsx's comment for why
import fs from 'node:fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from '../../src/layouts/AppLayout.jsx';
import Modal, { ModalFooter } from '../../src/components/common/Modal.jsx';
import { useAuthStore } from '../../src/store/authStore.js';
import { PageActions } from '../../src/contexts/PageActionsPortal.jsx';
import { setViewportWidth, resetViewport } from '../helpers/viewport.js';

vi.mock('../../src/services/notifications.api.js', () => ({
  getUnreadNotificationCount: vi.fn().mockResolvedValue({ count: 0 }),
  getNotifications: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

function DashboardStandIn() {
  return (
    <div>
      Dashboard Content
      <PageActions>
        <button type="button">ایکشن</button>
      </PageActions>
    </div>
  );
}

function renderLayout(url = '/', user = { id: 'u1', name: 'Zia', responsibility: 'IT', role: 'admin' }) {
  useAuthStore.getState().login(user, 'jwt');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardStandIn />} />
            <Route path="/users" element={<div>Users Content</div>} />
            <Route path="/settings" element={<div>Settings Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const sidebar = () => screen.getByRole('complementary');
const navLinks = () => within(screen.getByRole('navigation', { name: 'Main navigation' })).getAllByRole('link');

// The desktop shell (768px and wider): the navbar and the collapsible sidebar of the approved
// mockup (boards DesktopAfter / DesktopExpanded).
describe('AppLayout — desktop shell', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    window.localStorage.clear();
    setViewportWidth(1366);
  });
  afterEach(() => {
    resetViewport();
    vi.restoreAllMocks();
  });

  describe('navbar', () => {
    it('carries the real logo, the title "ٹاسک مینجمنٹ سسٹم" and the page\'s "ایکشن" button', () => {
      renderLayout();
      const navbar = screen.getByRole('banner');

      expect(navbar).toHaveClass('h-tk-navbar', 'bg-white', 'sticky');
      expect(within(navbar).getByText('ٹاسک مینجمنٹ سسٹم')).toBeInTheDocument();
      // The logo is the app's own asset (assets/logo/images.png, through LogoMark) — an <img>.
      const logo = navbar.querySelector('img');
      expect(logo).not.toBeNull();
      expect(logo.getAttribute('src')).toMatch(/images.*\.png$/);
      expect(within(navbar).getByRole('button', { name: 'ایکشن' })).toBeInTheDocument();
    });

    it('shows who is signed in, the bell and their initial; and today\'s date', () => {
      renderLayout();
      const navbar = screen.getByRole('banner');

      expect(within(navbar).getByText(/Zia/)).toHaveTextContent('Zia (IT)');
      expect(within(navbar).getByRole('button', { name: 'اطلاعات' })).toBeInTheDocument();
      expect(within(navbar).getByText('Z')).toHaveAttribute('aria-hidden', 'true');
      expect(navbar.textContent).toMatch(/20\d\d/); // the year of today's date
    });

    it('the title is NOT in the sidebar any more — once, in the navbar', () => {
      renderLayout();
      expect(screen.getAllByText('ٹاسک مینجمنٹ سسٹم')).toHaveLength(1);
      expect(sidebar()).not.toHaveTextContent('ٹاسک مینجمنٹ سسٹم');
      expect(sidebar().querySelector('img')).toBeNull();
    });
  });

  describe('sidebar', () => {
    it('is collapsed (icons only, 84px) by default: no labels, each link named and given a tooltip', () => {
      renderLayout();

      expect(sidebar()).toHaveClass('w-tk-rail', 'bg-tk-sidebar');
      expect(sidebar()).not.toHaveClass('w-tk-rail-open');
      expect(screen.queryByText('ڈیش بورڈ')).not.toBeInTheDocument();
      const links = navLinks();
      expect(links.map((link) => link.getAttribute('aria-label'))).toEqual(['ڈیش بورڈ', 'ترتیبات', 'تمام یوزرز', 'یوزر سمری رپورٹ']);
      // The tooltip is the link's own name, shown on hover and on keyboard focus (styles/tokens.css).
      links.forEach((link) => {
        expect(link).toHaveClass('tk-tooltip');
        expect(link).toHaveAttribute('data-tooltip', link.getAttribute('aria-label'));
      });
      expect(screen.getByRole('button', { name: 'لاگ آؤٹ' })).toHaveAttribute('data-tooltip', 'لاگ آؤٹ');
    });

    // The tooltips are drawn beside the rail, over the navbar and the page. The rail is lifted
    // above both only while the pointer or the keyboard focus is in it — and only when collapsed,
    // the one state that has tooltips.
    it('lifts the collapsed rail above the navbar and the page while hovered or focused, so its tooltips are not painted over', () => {
      renderLayout();
      expect(sidebar()).toHaveClass('md:hover:z-40', 'md:focus-within:z-40');

      fireEvent.click(screen.getByRole('button', { name: 'سائیڈبار پھیلائیں' }));
      expect(sidebar()).not.toHaveClass('md:hover:z-40');
      expect(sidebar()).not.toHaveClass('md:focus-within:z-40');
    });

    it('expands to 236px with labels (no tooltips needed then), and collapses again', () => {
      renderLayout();

      fireEvent.click(screen.getByRole('button', { name: 'سائیڈبار پھیلائیں' }));

      expect(sidebar()).toHaveClass('w-tk-rail-open');
      expect(navLinks().map((link) => link.textContent)).toEqual(['ڈیش بورڈ', 'ترتیبات', 'تمام یوزرز', 'یوزر سمری رپورٹ']);
      navLinks().forEach((link) => expect(link).not.toHaveAttribute('data-tooltip'));
      expect(screen.getByRole('button', { name: 'لاگ آؤٹ' })).toHaveTextContent('لاگ آؤٹ');
      expect(screen.getByRole('button', { name: 'سائیڈبار سکیڑیں' })).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(screen.getByRole('button', { name: 'سائیڈبار سکیڑیں' }));

      expect(sidebar()).toHaveClass('w-tk-rail');
      expect(screen.getByRole('button', { name: 'سائیڈبار پھیلائیں' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('THE CHOICE PERSISTS: expanded survives a reload, and so does collapsing again', () => {
      const first = renderLayout();
      fireEvent.click(screen.getByRole('button', { name: 'سائیڈبار پھیلائیں' }));
      expect(window.localStorage.getItem('sidebar.collapsed.v1')).toBe('false');
      first.unmount();

      const second = renderLayout(); // "reload"
      expect(sidebar()).toHaveClass('w-tk-rail-open');
      fireEvent.click(screen.getByRole('button', { name: 'سائیڈبار سکیڑیں' }));
      expect(window.localStorage.getItem('sidebar.collapsed.v1')).toBe('true');
      second.unmount();

      renderLayout();
      expect(sidebar()).toHaveClass('w-tk-rail');
    });

    it('works without localStorage: collapsed by default, still toggles, nothing thrown', () => {
      // Storage refuses the sidebar's key (the rest of the app's storage is left alone).
      const realGet = Storage.prototype.getItem;
      const realSet = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function getItem(key) {
        if (key === 'sidebar.collapsed.v1') throw new Error('blocked');
        return realGet.call(this, key);
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
        if (key === 'sidebar.collapsed.v1') throw new Error('blocked');
        return realSet.call(this, key, value);
      });

      expect(() => renderLayout()).not.toThrow();
      expect(sidebar()).toHaveClass('w-tk-rail');
      expect(() => fireEvent.click(screen.getByRole('button', { name: 'سائیڈبار پھیلائیں' }))).not.toThrow();
      expect(sidebar()).toHaveClass('w-tk-rail-open');
    });

    it('the active item is highlighted (a light pill) and is aria-current; the others are not', () => {
      renderLayout('/users');
      const [dashboard, , users] = navLinks();

      expect(users).toHaveAttribute('aria-current', 'page');
      expect(users).toHaveClass('bg-tk-green-50', 'text-tk-sidebar');
      expect(dashboard).not.toHaveAttribute('aria-current');
      expect(dashboard).not.toHaveClass('bg-tk-green-50');
    });

    it('keeps the role rules: a normal user has no users / report links', () => {
      renderLayout('/', { id: 'u2', name: 'Ali', role: 'user' });
      expect(navLinks().map((link) => link.getAttribute('aria-label'))).toEqual(['ڈیش بورڈ', 'ترتیبات']);
    });
  });

  describe('content width', () => {
    it('the page content is centred and capped from 1600px up; the navbar and the sidebar are outside the cap', () => {
      const { container } = renderLayout();
      const page = container.querySelector('[data-page-container]');

      expect(page).toHaveClass('mx-auto', 'w-full', 'min-[1600px]:max-w-tk-content');
      expect(page).toContainElement(screen.getByText('Dashboard Content'));
      expect(page).not.toContainElement(screen.getByRole('banner'));
      expect(page).not.toContainElement(sidebar());
    });
  });
});

// The shared Modal: the new look is opt-in. Without the prop it renders what it always did.
describe('Modal — variant="redesign" is opt-in', () => {
  function Icon(props) {
    return <svg data-testid="modal-icon" {...props} />;
  }

  it('without the prop: exactly the classic markup (the Task Details dialog depends on this)', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="کام کی تفصیل">
        <p>body</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog', { name: 'کام کی تفصیل' });
    const card = dialog.firstElementChild;

    expect(dialog).not.toHaveAttribute('data-modal-variant');
    expect(dialog.className).toBe('relative w-full max-md:max-w-none max-w-lg');
    expect(card.className).toBe(
      'relative max-h-[90vh] w-full overflow-y-auto rounded-lg border-t-4 border-brand bg-white p-4 shadow-xl max-md:max-h-[88vh] max-md:rounded-b-none max-md:rounded-t-[20px] max-md:pb-[calc(1rem+env(safe-area-inset-bottom,0px))]'
    );
    expect(dialog.previousElementSibling.className).toBe('absolute inset-0 bg-black/50');
    const heading = screen.getByRole('heading', { name: 'کام کی تفصیل' });
    expect(heading.className).toBe('px-10 text-center text-xl font-bold');
    expect(screen.queryByTestId('modal-icon')).not.toBeInTheDocument();
  });

  it('with the prop: rounded 28px card, green-tinted overlay, icon chip, title, subtitle and a 40px close button', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="نیا کام" variant="redesign" icon={Icon} subtitle="کام کی تفصیل اور ذمہ داران منتخب کریں" maxWidthClassName="max-w-[760px]">
        <p>body</p>
        <ModalFooter>
          <button type="button">محفوظ کریں</button>
        </ModalFooter>
      </Modal>
    );
    const dialog = screen.getByRole('dialog', { name: 'نیا کام' });
    const card = dialog.firstElementChild;

    expect(dialog).toHaveAttribute('data-modal-variant', 'redesign');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('max-w-[760px]');
    expect(card).toHaveClass('rounded-tk-modal', 'bg-tk-card', 'shadow-tk-modal', 'tk-modal-enter', 'max-md:rounded-b-none');
    expect(dialog.previousElementSibling).toHaveClass('bg-tk-overlay');
    expect(screen.getByTestId('modal-icon')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'نیا کام' })).toHaveClass('text-[21px]', 'font-semibold');
    expect(screen.getByText('کام کی تفصیل اور ذمہ داران منتخب کریں')).toBeInTheDocument();
    // The body scrolls inside the card; the footer sticks to its bottom.
    const body = card.querySelector('[data-modal-body]');
    expect(body).toHaveClass('overflow-y-auto');
    expect(screen.getByRole('button', { name: 'محفوظ کریں' }).parentElement).toHaveClass('sticky', 'bottom-0');

    // Same contract as ever: the close button, the backdrop and Escape all close it.
    const [backdrop, close] = screen.getAllByRole('button', { name: 'بند کریں' });
    fireEvent.click(close);
    fireEvent.click(backdrop);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  // Bug fix — a redesigned dialog used to render where it was declared, inside the page; a
  // stacking layer around the page then kept it and its overlay under the navbar.
  it('redesign: is drawn on <body>, above the whole layout — not where it is declared', () => {
    const { container, unmount } = render(
      <Modal isOpen onClose={vi.fn()} title="نیا کام" variant="redesign">
        <p>body</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog', { name: 'نیا کام' });
    const root = dialog.parentElement;

    expect(container).not.toContainElement(dialog);
    expect(root.parentElement).toBe(document.body);
    // Over the navbar (z-30) and the drawers and menus (z-50); toasts stay above it.
    expect(root).toHaveClass('tk-modal-root', 'fixed', 'inset-0', 'z-[70]');
    expect(root).not.toHaveClass('z-50');

    unmount();
    expect(document.querySelector('[data-modal-root]')).toBeNull();
  });

  it('redesign: the card is bound to the window — the header never shrinks, only the body scrolls, the footer sticks', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="نیا کام" variant="redesign" icon={Icon} subtitle="ذیلی عنوان">
        <p>body</p>
        <ModalFooter>
          <button type="button">محفوظ کریں</button>
        </ModalFooter>
      </Modal>
    );
    const card = screen.getByRole('dialog', { name: 'نیا کام' }).firstElementChild;

    // The height limit itself is in styles/tokens.css (.tk-modal-panel: the window less 16px
    // above and the busy strip's room beneath, in dvh with a vh fallback).
    expect(card).toHaveClass('tk-modal-panel', 'flex', 'flex-col', 'overflow-hidden');
    expect(card).not.toHaveClass('max-h-[90vh]');
    expect(card.querySelector('[data-modal-header]')).toHaveClass('shrink-0');
    expect(card.querySelector('[data-modal-body]')).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(card.querySelector('[data-modal-footer]')).toHaveClass('sticky', 'bottom-0');
    expect(card.querySelector('[data-modal-footer]')).toContainElement(screen.getByRole('button', { name: 'محفوظ کریں' }));
  });

  it('classic: is still drawn in place, exactly where it is declared', () => {
    const { container } = render(
      <Modal isOpen onClose={vi.fn()} title="کام کی تفصیل">
        <p>body</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog', { name: 'کام کی تفصیل' });
    expect(container).toContainElement(dialog);
    expect(dialog.parentElement.className).toBe('fixed inset-0 z-50 flex items-center justify-center p-4 max-md:items-end max-md:p-0');
    expect(document.querySelector('[data-modal-root]')).toBeNull();
  });

  it('renders nothing while closed, in either variant', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()} title="x" variant="redesign">
        body
      </Modal>
    );
    expect(container).toBeEmptyDOMElement();
  });
});

// The two rules of styles/tokens.css this fix rests on. jsdom applies no stylesheet and lays
// nothing out, so they are checked as text: enough to stop either being undone by accident.
describe('styles/tokens.css — what the dialogs rely on', () => {
  // Read from disk, relative to the project root the tests run in (Vitest hands back an empty
  // string for an imported stylesheet).
  const css = fs.readFileSync('src/styles/tokens.css', 'utf8').replace(/\r\n/g, '\n');
  const rule = (selector) => {
    const at = css.indexOf(`${selector} {`);
    return at === -1 ? '' : css.slice(at, css.indexOf('}', at));
  };

  it('the page fade and the dialog entrance have NO fill-mode (a filled animation stays in effect and keeps a stacking layer)', () => {
    for (const selector of ['.tk-fade-in', '.tk-modal-enter']) {
      const animation = /animation:\s*([^;]+);/.exec(rule(selector))?.[1];
      expect(animation, selector).toBeTruthy();
      expect(animation, selector).not.toMatch(/\b(both|forwards)\b/);
    }
  });

  it('the dialog card is never taller than the window: a vh limit first, the dvh one after it', () => {
    const panel = rule('.tk-modal-panel');
    const vh = panel.indexOf('max-height: calc(100vh');
    const dvh = panel.indexOf('max-height: calc(100dvh');
    expect(vh).toBeGreaterThan(-1);
    expect(dvh).toBeGreaterThan(vh);
    // ...and as a bottom sheet (below 768px): 88% of the window, again vh then dvh.
    const sheet = css.slice(css.indexOf('@media (max-width: 767.98px)', css.indexOf('.tk-modal-panel {')));
    expect(sheet.indexOf('max-height: 88vh;')).toBeGreaterThan(-1);
    expect(sheet.indexOf('max-height: 88dvh;')).toBeGreaterThan(sheet.indexOf('max-height: 88vh;'));
  });
});
