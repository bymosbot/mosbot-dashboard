import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateFileModal from './CreateFileModal';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useToastStore } from '../stores/toastStore';

// Mock stores
vi.mock('../stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('../stores/toastStore', () => ({
  useToastStore: vi.fn(),
}));

describe('CreateFileModal', () => {
  const mockOnClose = vi.fn();
  const mockCreateFile = vi.fn();
  const mockShowToast = vi.fn();
  const mockFetchListing = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.mockReturnValue({
      createFile: mockCreateFile,
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
      <CreateFileModal isOpen={false} onClose={mockOnClose} currentPath="/" />
    );

    expect(screen.queryByText('Create New File')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    expect(screen.getByText('Create New File')).toBeInTheDocument();
    expect(screen.getByLabelText(/File Name or Path/)).toBeInTheDocument();
  });

  it('displays current path', () => {
    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/documents" />
    );

    expect(screen.getByText('Base location:')).toBeInTheDocument();
    expect(screen.getByText('/documents')).toBeInTheDocument();
  });

  it('displays root path correctly', () => {
    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    expect(screen.getByText('Base location:')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('allows typing file name', async () => {
    const user = userEvent.setup();
    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText(/File Name or Path/);
    await user.type(input, 'test.txt');

    expect(input).toHaveValue('test.txt');
  });

  it('creates file with correct path at root', async () => {
    const user = userEvent.setup();
    mockCreateFile.mockResolvedValue({});

    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText(/File Name or Path/);
    await user.type(input, 'newfile.txt');

    const submitButton = screen.getByText('Create File');
    await user.click(submitButton);

    expect(mockCreateFile).toHaveBeenCalledWith({
      path: '/newfile.txt',
      content: '',
    });
    expect(mockShowToast).toHaveBeenCalledWith(
      'File "newfile.txt" created successfully',
      'success'
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('creates file with correct path in subdirectory', async () => {
    const user = userEvent.setup();
    mockCreateFile.mockResolvedValue({});

    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/documents" />
    );

    const input = screen.getByLabelText(/File Name or Path/);
    await user.type(input, 'document.txt');

    const submitButton = screen.getByText('Create File');
    await user.click(submitButton);

    expect(mockCreateFile).toHaveBeenCalledWith({
      path: '/documents/document.txt',
      content: '',
    });
  });

  it('shows error when file name is empty', async () => {
    const user = userEvent.setup();
    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const submitButton = screen.getByText('Create File');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith('Path is required', 'error');
    expect(mockCreateFile).not.toHaveBeenCalled();
  });

  it('shows error when file name is only whitespace', async () => {
    const user = userEvent.setup();
    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText(/File Name or Path/);
    await user.type(input, '   ');

    const submitButton = screen.getByText('Create File');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith('Path is required', 'error');
  });

  it('shows error for invalid characters', async () => {
    const user = userEvent.setup();
    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText(/File Name or Path/);
    await user.type(input, 'file<name>.txt');

    const submitButton = screen.getByText('Create File');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith(
      'Path contains invalid characters',
      'error'
    );
  });

  it('allows nested paths with /', async () => {
    const user = userEvent.setup();
    mockCreateFile.mockResolvedValue({});

    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText(/File Name or Path/);
    await user.type(input, 'path/to/file.txt');

    const submitButton = screen.getByText('Create File');
    await user.click(submitButton);

    expect(mockCreateFile).toHaveBeenCalledWith({
      path: '/path/to/file.txt',
      content: '',
    });
  });

  it('shows error for path traversal attempts with ..', async () => {
    const user = userEvent.setup();
    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText(/File Name or Path/);
    await user.type(input, '../file.txt');

    const submitButton = screen.getByText('Create File');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith(
      'Path cannot contain ..',
      'error'
    );
  });

  it('shows error toast on create failure', async () => {
    const user = userEvent.setup();
    const error = new Error('Create failed');
    mockCreateFile.mockRejectedValue(error);

    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText(/File Name or Path/);
    await user.type(input, 'test.txt');

    const submitButton = screen.getByText('Create File');
    await user.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith('Create failed', 'error');
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('clears file name and closes on successful create', async () => {
    const user = userEvent.setup();
    mockCreateFile.mockResolvedValue({});

    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText(/File Name or Path/);
    await user.type(input, 'test.txt');

    const submitButton = screen.getByText('Create File');
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const closeButton = container.querySelector('button:has(svg)');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('disables buttons during submission', async () => {
    const user = userEvent.setup();
    let resolveCreate;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    mockCreateFile.mockReturnValue(createPromise);

    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText(/File Name or Path/);
    await user.type(input, 'test.txt');

    const submitButton = screen.getByText('Create File');
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Creating...')).toBeInTheDocument();

    resolveCreate({});
    await createPromise;
  });

  it('trims whitespace from file name', async () => {
    const user = userEvent.setup();
    mockCreateFile.mockResolvedValue({});

    render(
      <CreateFileModal isOpen={true} onClose={mockOnClose} currentPath="/" />
    );

    const input = screen.getByLabelText(/File Name or Path/);
    await user.type(input, '  test.txt  ');

    const submitButton = screen.getByText('Create File');
    await user.click(submitButton);

    expect(mockCreateFile).toHaveBeenCalledWith({
      path: '/test.txt',
      content: '',
    });
  });
});
