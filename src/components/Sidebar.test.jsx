import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../stores/authStore';

// Mock the auth store
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock BotAvatar
vi.mock('./BotAvatar', () => ({
  default: () => <div data-testid="bot-avatar">Bot Avatar</div>,
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
  };
});

describe('Sidebar', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({
      user: { id: 1, email: 'test@example.com', name: 'Test User' },
      logout: mockLogout,
      isAdmin: () => false,
    });
  });

  describe('Settings Link Visibility', () => {
    it('shows Settings link in navigation for all users', () => {
      useAuthStore.mockReturnValue({
        user: { id: 2, email: 'user@example.com', name: 'Regular User' },
        logout: mockLogout,
        isAdmin: () => false,
      });

      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('shows Settings link in navigation for admin users', () => {
      useAuthStore.mockReturnValue({
        user: { id: 1, email: 'admin@example.com', name: 'Admin User' },
        logout: mockLogout,
        isAdmin: () => true,
      });

      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('allows all users to expand Settings menu', async () => {
      const user = userEvent.setup();
      useAuthStore.mockReturnValue({
        user: { id: 2, email: 'user@example.com', name: 'Regular User' },
        logout: mockLogout,
        isAdmin: () => false,
      });

      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      await waitFor(() => {
        const settingsButton = screen.getByText('Settings').closest('button');
        expect(settingsButton).toBeInTheDocument();
      });

      const settingsButton = screen.getByText('Settings').closest('button');
      
      await act(async () => {
        await user.click(settingsButton);
      });

      // Check if Users submenu is visible
      await waitFor(() => {
        expect(screen.getByText('Users')).toBeInTheDocument();
      });
    });

    it('shows Users submenu item for all users', async () => {
      const user = userEvent.setup();
      useAuthStore.mockReturnValue({
        user: { id: 2, email: 'user@example.com', name: 'Regular User' },
        logout: mockLogout,
        isAdmin: () => false,
      });

      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      await waitFor(() => {
        const settingsButton = screen.getByText('Settings').closest('button');
        expect(settingsButton).toBeInTheDocument();
      });

      const settingsButton = screen.getByText('Settings').closest('button');
      
      await act(async () => {
        await user.click(settingsButton);
      });

      await waitFor(() => {
        const usersLink = screen.getByText('Users');
        expect(usersLink).toBeInTheDocument();
        expect(usersLink.closest('a')).toHaveAttribute('href', '/settings/users');
      });
    });
  });

  describe('Settings Dropdown Menu Item', () => {
    it('shows Settings link in user dropdown menu for all users', async () => {
      const user = userEvent.setup();
      useAuthStore.mockReturnValue({
        user: { id: 2, email: 'user@example.com', name: 'Regular User' },
        logout: mockLogout,
        isAdmin: () => false,
      });

      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });

      // Click on user profile dropdown button
      const profileButton = screen.getByText('Regular User').closest('button');
      
      await act(async () => {
        await user.click(profileButton);
      });

      // Wait for dropdown to appear and check if Settings link is in the dropdown
      await waitFor(() => {
        const settingsLinks = screen.getAllByText('Settings');
        // There will be two Settings links - one in nav and one in dropdown
        expect(settingsLinks.length).toBeGreaterThan(0);
        const dropdownSettingsLink = settingsLinks.find(link => 
          link.closest('a')?.getAttribute('href') === '/settings'
        );
        expect(dropdownSettingsLink).toBeInTheDocument();
      });
    });

    it('shows Settings link in user dropdown menu for admin users', async () => {
      const user = userEvent.setup();
      useAuthStore.mockReturnValue({
        user: { id: 1, email: 'admin@example.com', name: 'Admin User' },
        logout: mockLogout,
        isAdmin: () => true,
      });

      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      // Click on user profile dropdown button
      const profileButton = screen.getByText('Admin User').closest('button');
      
      await act(async () => {
        await user.click(profileButton);
      });

      // Wait for dropdown to appear and check if Settings link is in the dropdown
      await waitFor(() => {
        const settingsLinks = screen.getAllByText('Settings');
        // There will be two Settings links - one in nav and one in dropdown
        expect(settingsLinks.length).toBeGreaterThan(0);
        const dropdownSettingsLink = settingsLinks.find(link => 
          link.closest('a')?.getAttribute('href') === '/settings'
        );
        expect(dropdownSettingsLink).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Items', () => {
    it('renders all navigation items', () => {
      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Workspace')).toBeInTheDocument();
      expect(screen.getByText('Log')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('does not filter out Settings based on adminOnly property', () => {
      useAuthStore.mockReturnValue({
        user: { id: 2, email: 'user@example.com', name: 'Regular User' },
        logout: mockLogout,
        isAdmin: () => false,
      });

      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      // Settings should be visible even for non-admin users
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });
});
