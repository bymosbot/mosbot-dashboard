import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RenameModal from './RenameModal';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useToastStore } from '../stores/toastStore';

// Mock stores
vi.mock('../stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('../stores/toastStore', () => ({
  useToastStore: vi.fn(),
}));

describe('RenameModal', () => {
  const mockOnClose = vi.fn();
  const mockCreateFile = vi.fn();
  const mockDeleteFile = vi.fn();
  const mockFetchFileContent = vi.fn();
  const mockFetchListing = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.mockReturnValue({
      createFile: mockCreateFile,
      deleteFile: mockDeleteFile,
      fetchFileContent: mockFetchFileContent,
      fetchListing: mockFetchListing,
    });
    useToastStore.mockReturnValue({
      showToast: mockShowToast,
    });
  });

  it('does not render when isOpen is false', () => {
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    render(
      <RenameModal isOpen={false} onClose={mockOnClose} file={file} />
    );

    expect(screen.queryByText(/Rename/)).not.toBeInTheDocument();
  });

  it('does not render when file is not provided', () => {
    render(<RenameModal isOpen={true} onClose={mockOnClose} file={null} />);

    expect(screen.queryByText(/Rename/)).not.toBeInTheDocument();
  });

  it('renders modal when open with file', () => {
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    render(
      <RenameModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    expect(screen.getByText('Rename File')).toBeInTheDocument();
    expect(screen.getByLabelText('New Name')).toBeInTheDocument();
  });

  it('displays current file name', async () => {
    const file = { name: 'oldname.txt', path: '/oldname.txt', type: 'file' };
    render(
      <RenameModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('oldname.txt')).toBeInTheDocument();
    });
    expect(screen.getByText(/Current: oldname.txt/)).toBeInTheDocument();
  });

  it('shows "Rename Folder" for directory type', () => {
    const file = { name: 'folder', path: '/folder', type: 'directory' };
    render(
      <RenameModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    expect(screen.getByText('Rename Folder')).toBeInTheDocument();
  });

  it('renames file successfully', async () => {
    const user = userEvent.setup();
    const file = { name: 'old.txt', path: '/old.txt', type: 'file' };
    mockFetchFileContent.mockResolvedValue({ content: 'file content', encoding: 'utf8' });
    mockCreateFile.mockResolvedValue({});
    mockDeleteFile.mockResolvedValue({});
    mockFetchListing.mockResolvedValue({});

    render(
      <RenameModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('old.txt')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('New Name');
    await user.clear(input);
    await user.type(input, 'new.txt');

    const submitButton = screen.getByText('Rename');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetchFileContent).toHaveBeenCalledWith(expect.objectContaining({ path: '/old.txt' }));
      expect(mockCreateFile).toHaveBeenCalledWith(expect.objectContaining({
        path: '/new.txt',
        content: 'file content',
        encoding: 'utf8',
      }));
      expect(mockDeleteFile).toHaveBeenCalledWith(expect.objectContaining({ path: '/old.txt' }));
      expect(mockFetchListing).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('File renamed to "new.txt"', 'success');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows error when new name is empty', async () => {
    const user = userEvent.setup();
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    render(
      <RenameModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('test.txt')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('New Name');
    await user.clear(input);

    const submitButton = screen.getByText('Rename');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith('Name is required', 'error');
  });

  it('shows error when name has not changed', async () => {
    const user = userEvent.setup();
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    render(
      <RenameModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('test.txt')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Rename');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith('Please enter a different name', 'error');
  });

  it('shows error for invalid characters', async () => {
    const user = userEvent.setup();
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    render(
      <RenameModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('test.txt')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('New Name');
    await user.clear(input);
    await user.type(input, 'new<name>.txt');

    const submitButton = screen.getByText('Rename');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith('Name contains invalid characters', 'error');
  });

  it('shows error for path traversal attempts', async () => {
    const user = userEvent.setup();
    const file = { name: 'test.txt', path: '/test.txt', type: 'file' };
    render(
      <RenameModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('test.txt')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('New Name');
    await user.clear(input);
    await user.type(input, '../new.txt');

    const submitButton = screen.getByText('Rename');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith('Name cannot contain / or ..', 'error');
  });

  it('shows error for renaming directories', async () => {
    const user = userEvent.setup();
    const file = { name: 'folder', path: '/folder', type: 'directory' };
    render(
      <RenameModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('folder')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('New Name');
    await user.clear(input);
    await user.type(input, 'newfolder');

    const submitButton = screen.getByText('Rename');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith(
      'Renaming directories is not currently supported',
      'error'
    );
  });

  it('handles rename failure', async () => {
    const user = userEvent.setup();
    const file = { name: 'old.txt', path: '/old.txt', type: 'file' };
    const error = new Error('Rename failed');
    mockFetchFileContent.mockRejectedValue(error);

    render(
      <RenameModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('old.txt')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('New Name');
    await user.clear(input);
    await user.type(input, 'new.txt');

    const submitButton = screen.getByText('Rename');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Rename failed', 'error');
    });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calculates parent path correctly for nested files', async () => {
    const user = userEvent.setup();
    const file = { name: 'file.txt', path: '/documents/sub/file.txt', type: 'file' };
    mockFetchFileContent.mockResolvedValue({ content: 'content', encoding: 'utf8' });
    mockCreateFile.mockResolvedValue({});
    mockDeleteFile.mockResolvedValue({});
    mockFetchListing.mockResolvedValue({});

    render(
      <RenameModal isOpen={true} onClose={mockOnClose} file={file} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('file.txt')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('New Name');
    await user.clear(input);
    await user.type(input, 'newname.txt');

    const submitButton = screen.getByText('Rename');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateFile).toHaveBeenCalledWith(expect.objectContaining({
        path: '/documents/sub/newname.txt',
        content: 'content',
        encoding: 'utf8',
      }));
    });
  });
});
