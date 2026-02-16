import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useToastStore } from '../stores/toastStore';

// Mock stores
vi.mock('../stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('../stores/toastStore', () => ({
  useToastStore: vi.fn(),
}));

describe('DeleteConfirmModal', () => {
  const mockOnClose = vi.fn();
  const mockDeleteFile = vi.fn();
  const mockFetchListing = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.mockReturnValue({
      deleteFile: mockDeleteFile,
      fetchListing: mockFetchListing,
    });
    useToastStore.mockReturnValue({
      showToast: mockShowToast,
    });
  });

  it('does not render when isOpen is false', () => {
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    render(
      <DeleteConfirmModal isOpen={false} onClose={mockOnClose} file={file} />
    );

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('does not render when file is not provided', () => {
    render(<DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={null} />);

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('renders modal when open with file', () => {
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
  });

  it('displays file name in confirmation message', () => {
    const file = { name: 'important.txt', path: '/important.txt', type: 'file' };
    render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    expect(screen.getByText('important.txt')).toBeInTheDocument();
  });

  it('shows file-specific message for files', () => {
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    expect(screen.getByText(/the file/)).toBeInTheDocument();
  });

  it('shows folder-specific message for directories', () => {
    const file = { name: 'folder', path: '/folder', type: 'directory' };
    render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    expect(screen.getByText(/Are you sure you want to delete the folder/)).toBeInTheDocument();
    expect(screen.getByText(/Warning: This will delete the folder and all its contents recursively/)).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    const { container } = render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    const closeButton = container.querySelector('button[disabled]') || 
                       container.querySelector('button:has(svg)');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    const { container } = render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    const backdrop = container.querySelector('.bg-black.bg-opacity-75');
    await user.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('deletes file and shows success toast', async () => {
    const user = userEvent.setup();
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    mockDeleteFile.mockResolvedValue({});
    mockFetchListing.mockResolvedValue({});

    render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteFile).toHaveBeenCalledWith(expect.objectContaining({ path: '/test.txt' }));
      expect(mockFetchListing).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        'File "test.txt" deleted successfully',
        'success'
      );
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('deletes folder and shows success toast', async () => {
    const user = userEvent.setup();
    const file = { name: 'folder', path: '/folder', type: 'directory' };
    mockDeleteFile.mockResolvedValue({});
    mockFetchListing.mockResolvedValue({});

    render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteFile).toHaveBeenCalledWith(expect.objectContaining({ path: '/folder' }));
      expect(mockFetchListing).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        'Folder "folder" deleted successfully',
        'success'
      );
    });
  });

  it('shows error toast on delete failure', async () => {
    const user = userEvent.setup();
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    const error = new Error('Delete failed');
    mockDeleteFile.mockRejectedValue(error);

    render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    expect(mockShowToast).toHaveBeenCalledWith('Delete failed', 'error');
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('disables buttons during submission', async () => {
    const user = userEvent.setup();
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    let resolveDelete;
    const deletePromise = new Promise((resolve) => {
      resolveDelete = resolve;
    });
    mockDeleteFile.mockReturnValue(deletePromise);

    render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    // Check button is disabled and shows "Deleting..."
    expect(deleteButton).toBeDisabled();
    expect(screen.getByText('Deleting...')).toBeInTheDocument();

    // Complete the delete
    resolveDelete({});
    await deletePromise;
  });

  it('does not allow closing during submission', async () => {
    const user = userEvent.setup();
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    let resolveDelete;
    const deletePromise = new Promise((resolve) => {
      resolveDelete = resolve;
    });
    mockDeleteFile.mockReturnValue(deletePromise);

    render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    // Try to close via backdrop
    const backdrop = screen.getByText('Confirm Delete').closest('.fixed');
    await user.click(backdrop);

    // Should not close during submission
    expect(mockOnClose).not.toHaveBeenCalled();

    resolveDelete({});
    await deletePromise;
  });

  it('does not delete when file is not provided', async () => {
    render(
      <DeleteConfirmModal isOpen={true} onClose={mockOnClose} file={null} />
    );

    // Modal should not render, so no delete button
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});
