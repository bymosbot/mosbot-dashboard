import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateFolderModal from './CreateFolderModal';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useToastStore } from '../stores/toastStore';

// Mock stores
vi.mock('../stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('../stores/toastStore', () => ({
  useToastStore: vi.fn(),
}));

describe('CreateFolderModal', () => {
  const mockOnClose = vi.fn();
  const mockCreateDirectory = vi.fn();
  const mockShowToast = vi.fn();
  const mockFetchListing = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.mockReturnValue({
      createDirectory: mockCreateDirectory,
      listings: {},
      fetchListing: mockFetchListing,
    });
    useToastStore.mockReturnValue({
      showToast: mockShowToast,
    });
    // Default: no existing items in listing
    mockFetchListing.mockResolvedValue({ files: [] });
  });

  it('does not render when isOpen is false', () => {
    render(
      <CreateFolderModal isOpen={false} onClose={mockOnClose} currentPath="/" />
    );

    expect(screen.queryByText('Create New Folder')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    render(
      <CreateFolderModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    expect(screen.getByText('Create New Folder')).toBeInTheDocument();
    expect(screen.getByLabelText('Folder Name')).toBeInTheDocument();
  });

  it('creates folder with correct path at root', async () => {
    const user = userEvent.setup();
    mockCreateDirectory.mockResolvedValue({});

    render(
      <CreateFolderModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText('Folder Name');
    await user.type(input, 'newfolder');

    const submitButton = screen.getByText('Create Folder');
    await user.click(submitButton);

    expect(mockCreateDirectory).toHaveBeenCalledWith({ path: '/newfolder' });
    expect(mockShowToast).toHaveBeenCalledWith(
      'Folder "newfolder" created successfully',
      'success'
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('creates folder with correct path in subdirectory', async () => {
    const user = userEvent.setup();
    mockCreateDirectory.mockResolvedValue({});

    render(
      <CreateFolderModal isOpen={true} onClose={mockOnClose} currentPath="/documents" />
    );

    const input = screen.getByLabelText('Folder Name');
    await user.type(input, 'subfolder');

    const submitButton = screen.getByText('Create Folder');
    await user.click(submitButton);

    expect(mockCreateDirectory).toHaveBeenCalledWith({ path: '/documents/subfolder' });
  });

  it('shows error when folder name is empty', async () => {
    const user = userEvent.setup();
    render(
      <CreateFolderModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const submitButton = screen.getByText('Create Folder');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith('Folder name is required', 'error');
    expect(mockCreateDirectory).not.toHaveBeenCalled();
  });

  it('shows error for invalid characters', async () => {
    const user = userEvent.setup();
    render(
      <CreateFolderModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText('Folder Name');
    await user.type(input, 'folder<name>');

    const submitButton = screen.getByText('Create Folder');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith(
      'Folder name contains invalid characters',
      'error'
    );
  });

  it('shows error for path traversal attempts', async () => {
    const user = userEvent.setup();
    render(
      <CreateFolderModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText('Folder Name');
    await user.type(input, '../folder');

    const submitButton = screen.getByText('Create Folder');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith(
      'Folder name cannot contain / or ..',
      'error'
    );
  });

  it('shows error toast on create failure', async () => {
    const user = userEvent.setup();
    const error = new Error('Create failed');
    mockCreateDirectory.mockRejectedValue(error);

    render(
      <CreateFolderModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText('Folder Name');
    await user.type(input, 'testfolder');

    const submitButton = screen.getByText('Create Folder');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith('Create failed', 'error');
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('clears folder name and closes on successful create', async () => {
    const user = userEvent.setup();
    mockCreateDirectory.mockResolvedValue({});

    render(
      <CreateFolderModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText('Folder Name');
    await user.type(input, 'testfolder');

    const submitButton = screen.getByText('Create Folder');
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('trims whitespace from folder name', async () => {
    const user = userEvent.setup();
    mockCreateDirectory.mockResolvedValue({});

    render(
      <CreateFolderModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText('Folder Name');
    await user.type(input, '  testfolder  ');

    const submitButton = screen.getByText('Create Folder');
    await user.click(submitButton);

    expect(mockCreateDirectory).toHaveBeenCalledWith({ path: '/testfolder' });
  });
});
