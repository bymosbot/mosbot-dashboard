import { Fragment, useState, useEffect, useCallback } from "react";
import { Dialog, Transition, Tab } from "@headlessui/react";
import {
  XMarkIcon,
  PencilIcon,
  ClockIcon,
  PlusCircleIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
  PencilSquareIcon,
  ChatBubbleLeftRightIcon,
  ShareIcon,
  CheckIcon,
  BoltIcon,
  LinkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import MarkdownRenderer from "./MarkdownRenderer";
import { useTaskStore } from "../stores/taskStore";
import { useActivityStore } from "../stores/activityStore";
import { useAuthStore } from "../stores/authStore";
import logger from "../utils/logger";
import { useToastStore } from "../stores/toastStore";
import {
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_TYPE,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  TASK_TYPE_CONFIG,
} from "../utils/constants";
import { api } from "../api/client";
import {
  formatDateTimeLocal,
  parseDatabaseDate,
  classNames,
} from "../utils/helpers";
import { format } from "date-fns";

// Icon component mapping for task types
const ICON_MAP = {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
  BoltIcon,
};

// Unicode icons for dropdown options (since select options can't render React components)
const TASK_TYPE_UNICODE_ICONS = {
  task: '✓',
  bug: '⚠',
  feature: '✨',
  improvement: '↗',
  research: '🔍',
  epic: '⚡',
};

export default function TaskModal({ isOpen, onClose, task = null }) {
  const { createTask, updateTask, deleteTask, fetchTaskHistory } =
    useTaskStore();
  const { fetchTaskActivity } = useActivityStore();
  const { user: currentUser } = useAuthStore();
  const { showToast } = useToastStore();

  // Preserve the task internally to prevent glitches during modal close animation
  const [internalTask, setInternalTask] = useState(null);

  // View/Edit mode: 'view' for existing tasks, 'edit' for new tasks or when editing
  const [mode, setMode] = useState("edit");

  // History data
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Comments data
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState(null);

  // Activity data
  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);

  // Dependencies data
  const [dependencies, setDependencies] = useState({
    depends_on: [],
    dependents: [],
  });
  const [loadingDependencies, setLoadingDependencies] = useState(false);
  const [dependenciesLoaded, setDependenciesLoaded] = useState(false);

  // Subtasks data
  const [subtasks, setSubtasks] = useState([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [subtasksLoaded, setSubtasksLoaded] = useState(false);

  // Active tab index (0: Comments, 1: History, 2: Activity)
  const [activeTab, setActiveTab] = useState(0);

  // Users list for assignee dropdown
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Epic tasks for parent epic dropdown
  const [epicTasks, setEpicTasks] = useState([]);
  const [loadingEpics, setLoadingEpics] = useState(false);

  // Share button state
  const [copied, setCopied] = useState(false);

  // Submit loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dependency management state
  const [showAddDependency, setShowAddDependency] = useState(false);
  const [selectedDependencyTask, setSelectedDependencyTask] = useState("");
  const [dependencyType, setDependencyType] = useState("blocked_by"); // "blocked_by" or "is_blocking"
  const [availableTasks, setAvailableTasks] = useState([]);
  const [loadingAvailableTasks, setLoadingAvailableTasks] = useState(false);
  const [isAddingDependency, setIsAddingDependency] = useState(false);

  // Tags state
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allExistingTags, setAllExistingTags] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: TASK_STATUS.PLANNING,
    priority: TASK_PRIORITY.MEDIUM,
    type: TASK_TYPE.TASK,
    dueDate: "",
    assignee_id: "",
    parent_task_id: "",
    tags: [],
  });

  // Fetch active users for assignee dropdown
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get("/users", {
        params: { active_only: "true" },
      });
      setUsers(response.data.data || []);
    } catch (error) {
      logger.error("Failed to fetch users", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch epic tasks for parent epic dropdown
  const fetchEpicTasks = async () => {
    setLoadingEpics(true);
    try {
      const response = await api.get("/tasks");
      // Filter for epic type tasks that are not archived
      const epics = (response.data.data || []).filter(
        (t) => t.type === TASK_TYPE.EPIC && t.status !== TASK_STATUS.ARCHIVE
      );
      setEpicTasks(epics);
    } catch (error) {
      logger.error("Failed to fetch epic tasks", error);
    } finally {
      setLoadingEpics(false);
    }
  };

  // Fetch all existing tags from tasks
  const fetchExistingTags = useCallback(async () => {
    // TODO: Optimize - Consider adding a backend API endpoint for tags (e.g., GET /tags)
    // to avoid fetching up to 1000 tasks just to extract tags
    try {
      const response = await api.get("/tasks", { params: { limit: 1000 } });
      const allTasks = response.data.data || [];
      const tagSet = new Set();

      // Extract tags from all tasks (assuming tags might be stored as comma-separated string or array)
      allTasks.forEach((task) => {
        if (task.tags) {
          if (Array.isArray(task.tags)) {
            task.tags.forEach((tag) => {
              const tagStr = String(tag).trim().toLowerCase();
              if (tagStr) tagSet.add(tagStr);
            });
          } else if (typeof task.tags === "string") {
            task.tags.split(/[,\s]+/).forEach((tag) => {
              const trimmed = tag.trim();
              if (trimmed) tagSet.add(trimmed.toLowerCase());
            });
          }
        }
      });

      setAllExistingTags([...tagSet]);
    } catch (error) {
      console.error("Failed to fetch existing tags:", error);
    }
  }, []);

  const loadComments = async (taskId, { force = false } = {}) => {
    // Don't reload if already loaded
    if (!force && commentsLoaded) return;

    setLoadingComments(true);
    try {
      const response = await api.get(`/tasks/${taskId}/comments`);
      setComments(response.data.data || []);
      setCommentsLoaded(true);
    } catch (error) {
      logger.error("Failed to load comments", error);
      showToast(
        error.response?.data?.error?.message || "Failed to load comments",
        "error"
      );
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    // Only update internal task and form when modal opens
    if (isOpen) {
      setInternalTask(task);

      // Fetch users for dropdown
      fetchUsers();

      // Fetch epic tasks for parent dropdown
      fetchEpicTasks();

      // Fetch existing tags for autocomplete
      fetchExistingTags();

      // Set mode: view for existing tasks, edit for new tasks
      setMode(task ? "view" : "edit");

      // Reset tab to Comments when opening modal
      setActiveTab(0);

      if (task) {
        // Parse tags from task
        let taskTags = [];
        if (task.tags) {
          if (Array.isArray(task.tags)) {
            taskTags = task.tags
              .map((t) => (typeof t === "string" ? t.trim() : String(t).trim()))
              .filter((t) => t);
          } else if (typeof task.tags === "string") {
            taskTags = task.tags
              .split(/[,\s]+/)
              .map((t) => t.trim())
              .filter((t) => t);
          }
        }

        setTags(taskTags);
        setFormData({
          title: task.title || "",
          description: task.summary || "", // API uses 'summary', frontend uses 'description'
          status: task.status || TASK_STATUS.PLANNING,
          priority: task.priority || TASK_PRIORITY.MEDIUM,
          type: task.type || TASK_TYPE.TASK,
          dueDate: task.due_date
            ? new Date(task.due_date).toISOString().split("T")[0]
            : "", // API uses 'due_date'
          assignee_id: task.assignee_id || "", // Use assignee_id from API
          parent_task_id: task.parent_task_id || "",
          tags: taskTags,
        });

        // Reset loaded flags when opening a new task
        setHistoryLoaded(false);
        setActivityLoaded(false);
        setCommentsLoaded(false);
        setDependenciesLoaded(false);
        setSubtasksLoaded(false);
        setComments([]);
        setCommentDraft("");
        setDependencies({ depends_on: [], dependents: [] });
        setSubtasks([]);

        // Don't fetch history and activity immediately - wait for tab click
        // This improves performance by only loading data when needed

        // Comments are the default tab, so load them immediately in view mode
        loadComments(task.id, { force: true });

        // Load dependencies and subtasks immediately for relationship display
        loadDependencies(task.id);
        loadSubtasks(task.id);
      } else {
        setTags([]);
        setTagInput("");
        setFormData({
          title: "",
          description: "",
          status: TASK_STATUS.PLANNING,
          priority: TASK_PRIORITY.MEDIUM,
          type: TASK_TYPE.TASK,
          dueDate: "",
          assignee_id: "",
          parent_task_id: "",
          tags: [],
        });
        setHistory([]);
        setActivity([]);
        setComments([]);
        setCommentDraft("");
        setDependencies({ depends_on: [], dependents: [] });
        setSubtasks([]);
        setHistoryLoaded(false);
        setActivityLoaded(false);
        setCommentsLoaded(false);
        setDependenciesLoaded(false);
        setSubtasksLoaded(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, isOpen]);

  const loadHistory = async (taskId) => {
    // Don't reload if already loaded
    if (historyLoaded) return;

    setLoadingHistory(true);
    try {
      const historyData = await fetchTaskHistory(taskId);
      setHistory(historyData);
      setHistoryLoaded(true);
    } catch (error) {
      logger.error("Failed to load history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadActivity = async (taskId) => {
    // Don't reload if already loaded
    if (activityLoaded) return;

    setLoadingActivity(true);
    try {
      const activityData = await fetchTaskActivity(taskId);
      setActivity(activityData);
      setActivityLoaded(true);
    } catch (error) {
      logger.error("Failed to load activity", error);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Load dependencies
  const loadDependencies = async (taskId) => {
    if (loadingDependencies || dependenciesLoaded) return;

    setLoadingDependencies(true);
    try {
      const response = await api.get(`/tasks/${taskId}/dependencies`);
      setDependencies(response.data.data || { depends_on: [], dependents: [] });
      setDependenciesLoaded(true);
    } catch (error) {
      logger.error("Failed to load dependencies", error);
      showToast(
        error.response?.data?.error?.message ||
          "Failed to load task dependencies",
        "error"
      );
    } finally {
      setLoadingDependencies(false);
    }
  };

  // Load subtasks
  const loadSubtasks = async (taskId) => {
    if (loadingSubtasks || subtasksLoaded) return;

    setLoadingSubtasks(true);
    try {
      const response = await api.get(`/tasks/${taskId}/subtasks`);
      setSubtasks(response.data.data || []);
      setSubtasksLoaded(true);
    } catch (error) {
      logger.error("Failed to load subtasks", error);
      showToast(
        error.response?.data?.error?.message || "Failed to load subtasks",
        "error"
      );
    } finally {
      setLoadingSubtasks(false);
    }
  };

  // Load available tasks for dependency dropdown
  const loadAvailableTasks = async () => {
    if (!internalTask) return;
    
    setLoadingAvailableTasks(true);
    try {
      const response = await api.get("/tasks");
      // Filter out current task, archived tasks, and already dependent tasks
      const currentDependencyIds = new Set([
        internalTask.id,
        ...dependencies.depends_on.map(d => d.id),
        ...dependencies.dependents.map(d => d.id)
      ]);
      
      const available = (response.data.data || []).filter(
        (t) => !currentDependencyIds.has(t.id) && t.status !== "ARCHIVE"
      );
      setAvailableTasks(available);
    } catch (error) {
      logger.error("Failed to load available tasks", error);
      showToast("Failed to load tasks", "error");
    } finally {
      setLoadingAvailableTasks(false);
    }
  };

  // Add dependency
  const handleAddDependency = async () => {
    if (!selectedDependencyTask || !internalTask || isAddingDependency) return;

    setIsAddingDependency(true);
    try {
      if (dependencyType === "blocked_by") {
        // Current task is blocked by selected task
        await api.post(`/tasks/${internalTask.id}/dependencies`, {
          depends_on_task_id: selectedDependencyTask
        });
      } else {
        // Selected task is blocked by current task (reverse relationship)
        await api.post(`/tasks/${selectedDependencyTask}/dependencies`, {
          depends_on_task_id: internalTask.id
        });
      }
      
      showToast("Dependency added successfully", "success");
      
      // Reset form first
      setSelectedDependencyTask("");
      setDependencyType("blocked_by");
      setShowAddDependency(false);
      
      // Force reload dependencies by resetting all flags
      setDependenciesLoaded(false);
      setLoadingDependencies(false);
      
      // Trigger immediate reload with loading state
      setLoadingDependencies(true);
      try {
        const response = await api.get(`/tasks/${internalTask.id}/dependencies`);
        setDependencies(response.data.data || { depends_on: [], dependents: [] });
        setDependenciesLoaded(true);
      } catch (error) {
        logger.error("Failed to reload dependencies", error);
      } finally {
        setLoadingDependencies(false);
      }
    } catch (error) {
      logger.error("Failed to add dependency", error);
      showToast(
        error.response?.data?.error?.message || "Failed to add dependency",
        "error"
      );
    } finally {
      setIsAddingDependency(false);
    }
  };

  // Remove dependency
  const handleRemoveDependency = async (dependsOnTaskId) => {
    if (!internalTask) return;

    try {
      await api.delete(`/tasks/${internalTask.id}/dependencies/${dependsOnTaskId}`);
      
      showToast("Dependency removed successfully", "success");
      
      // Force reload dependencies with loading state
      setDependenciesLoaded(false);
      setLoadingDependencies(true);
      try {
        const response = await api.get(`/tasks/${internalTask.id}/dependencies`);
        setDependencies(response.data.data || { depends_on: [], dependents: [] });
        setDependenciesLoaded(true);
      } catch (error) {
        logger.error("Failed to reload dependencies", error);
      } finally {
        setLoadingDependencies(false);
      }
    } catch (error) {
      logger.error("Failed to remove dependency", error);
      showToast(
        error.response?.data?.error?.message || "Failed to remove dependency",
        "error"
      );
    }
  };

  // Handle tab change - lazy load data when tabs are clicked
  const handleTabChange = (index) => {
    setActiveTab(index);

    // Only load data if we have a task and are in view mode
    if (!internalTask || mode !== "view") return;

    // Tab indices: 0 = Comments, 1 = History, 2 = Activity
    if (index === 0 && !commentsLoaded) {
      loadComments(internalTask.id);
    } else if (index === 1 && !historyLoaded) {
      // History tab clicked - load history
      loadHistory(internalTask.id);
    } else if (index === 2 && !activityLoaded) {
      // Activity tab clicked - load activity
      loadActivity(internalTask.id);
    }
  };

  const handlePostComment = async () => {
    if (!internalTask || mode !== "view") return;
    if (isPostingComment) return;

    const body = commentDraft.trim();
    if (!body) {
      showToast("Comment cannot be empty", "error");
      return;
    }

    if (body.length > 5000) {
      showToast("Comment must be 5000 characters or less", "error");
      return;
    }

    setIsPostingComment(true);
    try {
      const response = await api.post(`/tasks/${internalTask.id}/comments`, {
        body,
      });
      const newComment = response.data.data;

      setComments((prev) => [...prev, newComment]);
      setCommentDraft("");
      setCommentsLoaded(true);
      showToast("Comment added", "success");
    } catch (error) {
      logger.error("Failed to post comment", error);
      showToast(
        error.response?.data?.error?.message || "Failed to post comment",
        "error"
      );
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentBody("");
  };

  const handleUpdateComment = async (commentId) => {
    if (!internalTask || isUpdatingComment) return;

    const body = editingCommentBody.trim();
    if (!body) {
      showToast("Comment cannot be empty", "error");
      return;
    }

    if (body.length > 5000) {
      showToast("Comment must be 5000 characters or less", "error");
      return;
    }

    setIsUpdatingComment(true);
    try {
      const response = await api.patch(
        `/tasks/${internalTask.id}/comments/${commentId}`,
        { body }
      );
      const updatedComment = response.data.data;

      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updatedComment : c))
      );
      setEditingCommentId(null);
      setEditingCommentBody("");
      showToast("Comment updated", "success");
    } catch (error) {
      logger.error("Failed to update comment", error);
      showToast(
        error.response?.data?.error?.message || "Failed to update comment",
        "error"
      );
    } finally {
      setIsUpdatingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!internalTask || isDeletingCommentId) return;

    if (!window.confirm("Delete this comment? This action cannot be undone.")) {
      return;
    }

    setIsDeletingCommentId(commentId);
    try {
      await api.delete(`/tasks/${internalTask.id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      showToast("Comment deleted", "success");
    } catch (error) {
      logger.error("Failed to delete comment", error);
      showToast(
        error.response?.data?.error?.message || "Failed to delete comment",
        "error"
      );
    } finally {
      setIsDeletingCommentId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) return;

    setIsSubmitting(true);

    // Transform data to match API format (field name mapping)
    const taskData = {
      title: formData.title,
      summary: formData.description || null, // API expects 'summary', not 'description'
      status: formData.status || TASK_STATUS.PLANNING,
      priority: formData.priority || null,
      type: formData.type || TASK_TYPE.TASK,
      due_date: formData.dueDate || null, // API expects 'due_date', not 'dueDate'
      assignee_id: formData.assignee_id || null, // Use assignee_id from dropdown
      parent_task_id: formData.parent_task_id || null,
      // Note: API doesn't support 'tags' yet, but we keep it in formData for future use
      tags: tags && tags.length > 0 ? tags : null,
    };

    try {
      if (internalTask) {
        const updated = await updateTask(internalTask.id, taskData);

        // Preserve reporter_name from the original task if not in the response
        const mergedTask = {
          ...updated,
          reporter_name: updated.reporter_name || internalTask.reporter_name,
        };

        setInternalTask(mergedTask);

        // Update formData with the merged task data
        setFormData({
          title: mergedTask.title || "",
          description: mergedTask.summary || "",
          status: mergedTask.status || TASK_STATUS.PLANNING,
          priority: mergedTask.priority || TASK_PRIORITY.MEDIUM,
          type: mergedTask.type || TASK_TYPE.TASK,
          dueDate: mergedTask.due_date
            ? new Date(mergedTask.due_date).toISOString().split("T")[0]
            : "",
          assignee_id: mergedTask.assignee_id || "",
          parent_task_id: mergedTask.parent_task_id || "",
          tags: tags,
        });

        // Reset loaded flags to force reload on next tab visit
        setHistoryLoaded(false);
        setActivityLoaded(false);

        // If user is currently viewing History or Activity tab, reload that data
        if (activeTab === 1) {
          await loadHistory(internalTask.id);
        } else if (activeTab === 2) {
          await loadActivity(internalTask.id);
        }

        // Show success toast
        showToast("Task updated successfully", "success");

        // Switch back to view mode
        setMode("view");
      } else {
        await createTask(taskData);
        showToast("Task created successfully", "success");
        onClose();
      }
    } catch (error) {
      logger.error("Failed to save task", error);

      // Handle dependency blocking (409 Conflict)
      if (error.response?.status === 409) {
        const blockingTasks = error.response?.data?.error?.blocking_tasks || [];
        if (blockingTasks.length > 0) {
          const taskKeys = blockingTasks
            .map(
              (t) =>
                t.key ||
                (t.task_number
                  ? `TASK-${t.task_number}`
                  : t.id || "Unknown task")
            )
            .filter(Boolean)
            .join(", ");
          showToast(
            `Task is blocked by: ${taskKeys}. Complete these tasks first.`,
            "error"
          );
        } else {
          showToast(
            error.response?.data?.error?.message ||
              "Task is blocked by dependencies",
            "error"
          );
        }
      } else {
        showToast(
          error.response?.data?.error?.message || "Failed to save task",
          "error"
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      internalTask &&
      window.confirm("Are you sure you want to delete this task?")
    ) {
      try {
        await deleteTask(internalTask.id);
        showToast("Task deleted successfully", "success");
        onClose();
      } catch (error) {
        console.error("Failed to delete task:", error);
        showToast(
          error.response?.data?.error?.message || "Failed to delete task",
          "error"
        );
      }
    }
  };

  const handleArchive = async () => {
    if (
      internalTask &&
      window.confirm(
        "Archive this task? It will be moved to the Archived section."
      )
    ) {
      try {
        await updateTask(internalTask.id, { status: TASK_STATUS.ARCHIVE });
        showToast("Task archived successfully", "success");
        onClose();
      } catch (error) {
        console.error("Failed to archive task:", error);
        showToast(
          error.response?.data?.error?.message || "Failed to archive task",
          "error"
        );
      }
    }
  };

  const handleRestore = async () => {
    if (internalTask) {
      try {
        await updateTask(internalTask.id, { status: TASK_STATUS.DONE });
        showToast("Task restored successfully", "success");
        onClose();
      } catch (error) {
        console.error("Failed to restore task:", error);
        showToast(
          error.response?.data?.error?.message || "Failed to restore task",
          "error"
        );
      }
    }
  };

  const handleShare = async () => {
    if (internalTask) {
      // Use task key (TASK-####) in URL if available, otherwise fall back to UUID
      const identifier = internalTask.task_number
        ? `TASK-${internalTask.task_number}`
        : internalTask.id;
      const taskUrl = `${window.location.origin}/task/${identifier}`;
      try {
        await navigator.clipboard.writeText(taskUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle tag input changes
  const handleTagInputChange = (e) => {
    const value = e.target.value;
    setTagInput(value);

    // Update suggestions based on input
    const trimmedValue = value.trim();
    if (trimmedValue) {
      const query = trimmedValue.toLowerCase();
      const tagLowercase = (tags || []).map((t) => String(t).toLowerCase());
      const filtered = (allExistingTags || [])
        .filter(
          (tag) =>
            String(tag).toLowerCase().includes(query) &&
            !tagLowercase.includes(String(tag).toLowerCase())
        )
        .slice(0, 5);
      setTagSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setTagSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle tag input keydown
  const handleTagInputKeyDown = (e) => {
    const currentValue = tagInput;
    const trimmedInput = currentValue.trim();

    if (e.key === "Enter") {
      e.preventDefault();
      if (trimmedInput) {
        addTag(trimmedInput);
      }
    } else if (e.key === " ") {
      // Only add tag on space if there's actual non-whitespace content
      // We check the current value before the space is added
      if (trimmedInput && trimmedInput.length > 0) {
        e.preventDefault();
        addTag(trimmedInput);
      }
      // If input is empty or only whitespace, allow space to be typed normally
    } else if (
      e.key === "Backspace" &&
      currentValue === "" &&
      tags &&
      tags.length > 0
    ) {
      // Remove last tag if backspace on empty input
      e.preventDefault();
      removeTag(tags.length - 1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    } else if (
      e.key === "ArrowDown" &&
      tagSuggestions &&
      tagSuggestions.length > 0
    ) {
      e.preventDefault();
      // Could implement keyboard navigation here
    }
  };

  // Add a tag
  const addTag = (tagText) => {
    const trimmed = tagText.trim();
    if (!trimmed) return;

    // Check if tag already exists (case-insensitive)
    const currentTags = tags || [];
    const tagLowercase = currentTags.map((t) => String(t).toLowerCase());
    const normalizedInput = trimmed.toLowerCase();

    if (!tagLowercase.includes(normalizedInput)) {
      // Store the tag as entered (preserve capitalization)
      const newTags = [...currentTags, trimmed];
      setTags(newTags);
      setFormData((prev) => ({ ...prev, tags: newTags }));
    }

    setTagInput("");
    setTagSuggestions([]);
    setShowSuggestions(false);
  };

  // Remove a tag
  const removeTag = (index) => {
    const currentTags = tags || [];
    const newTags = currentTags.filter((_, i) => i !== index);
    setTags(newTags);
    setFormData((prev) => ({ ...prev, tags: newTags }));
  };

  // Select a suggestion
  const selectSuggestion = (suggestion) => {
    addTag(suggestion);
  };

  // Format history entry for display
  const formatHistoryEntry = (entry) => {
    const changes = [];

    // Special handling for comment events
    if (entry.event_type === "COMMENT_CREATED") {
      changes.push({
        field: "Comment",
        fieldKey: "comment_body",
        oldValue: null,
        newValue: entry.meta?.comment_body || "(no content)",
      });
      return changes;
    }

    if (entry.event_type === "COMMENT_UPDATED") {
      changes.push({
        field: "Comment",
        fieldKey: "comment_body",
        oldValue: entry.old_values?.comment_body || "(no content)",
        newValue: entry.new_values?.comment_body || "(no content)",
      });
      return changes;
    }

    if (entry.event_type === "COMMENT_DELETED") {
      changes.push({
        field: "Comment",
        fieldKey: "comment_body",
        oldValue: entry.old_values?.comment_body || "(no content)",
        newValue: null,
      });
      return changes;
    }

    if (entry.old_values && entry.new_values) {
      Object.keys(entry.new_values).forEach((key) => {
        const oldVal = entry.old_values[key];
        const newVal = entry.new_values[key];

        if (oldVal !== newVal) {
          const formattedKey = key.replace(/_/g, " ");
          changes.push({
            field: formattedKey,
            fieldKey: key, // Preserve original key for special formatting
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      });
    }

    return changes;
  };

  const formatValue = (
    value,
    isLongText = false,
    fieldKey = null,
    isOldValue = false
  ) => {
    // Special handling for comment_body - show preview
    if (fieldKey === "comment_body") {
      if (value === null || value === undefined) {
        // For old value: null means it's a new comment (didn't exist before)
        // For new value: null means it was deleted
        return isOldValue ? "(new)" : "(deleted)";
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return "(empty)";
        // Show first 150 chars with ellipsis if longer
        return trimmed.length > 150
          ? trimmed.substring(0, 150) + "..."
          : trimmed;
      }
      return String(value);
    }

    // Special handling for assignee_id - look up user name
    if (fieldKey === "assignee_id") {
      if (value === null || value === undefined || value === "") {
        return "Unassigned";
      }
      if (typeof value === "string" && value.trim()) {
        const user = users.find((u) => u.id === value);
        return user ? user.name : value; // Return user name if found, otherwise return the ID
      }
      return String(value);
    }

    if (value === null || value === undefined) return "none";
    if (typeof value === "boolean") return value ? "yes" : "no";

    // Check if it's a date string (ISO format or database timestamp)
    if (typeof value === "string") {
      // Check for ISO date format (contains 'T' and date-like pattern)
      const isoDatePattern =
        /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
      if (isoDatePattern.test(value.trim())) {
        const formatted = formatDateTimeLocal(value);
        return formatted || value; // Fallback to original if parsing fails
      }

      // Check for other date-like patterns (database timestamps without T)
      const dbDatePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
      if (dbDatePattern.test(value.trim())) {
        const formatted = formatDateTimeLocal(value);
        return formatted || value;
      }

      // Don't truncate if isLongText is true
      if (!isLongText && value.length > 50)
        return value.substring(0, 47) + "...";
    }

    return String(value);
  };

  // Check if a value is long text (for special rendering)
  const isLongText = (value) => {
    return typeof value === "string" && value.length > 100;
  };

  const getEventIcon = (eventType, _meta) => {
    const iconClass = "w-5 h-5";

    switch (eventType) {
      case "CREATED":
        return <PlusCircleIcon className={iconClass} />;
      case "STATUS_CHANGED":
        return <ArrowPathIcon className={iconClass} />;
      case "ARCHIVED_AUTO":
      case "ARCHIVED_MANUAL":
        return <ArchiveBoxIcon className={iconClass} />;
      case "RESTORED":
        return <ArrowUturnLeftIcon className={iconClass} />;
      case "DELETED":
        return <TrashIcon className={iconClass} />;
      case "COMMENT_CREATED":
        return <ChatBubbleLeftRightIcon className={iconClass} />;
      case "COMMENT_UPDATED":
        return <PencilIcon className={iconClass} />;
      case "COMMENT_DELETED":
        return <TrashIcon className={iconClass} />;
      default:
        return <PencilSquareIcon className={iconClass} />;
    }
  };

  const getEventColor = (eventType, _meta) => {
    switch (eventType) {
      case "CREATED":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "STATUS_CHANGED":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "ARCHIVED_AUTO":
      case "ARCHIVED_MANUAL":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "RESTORED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "DELETED":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "COMMENT_CREATED":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "COMMENT_UPDATED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "COMMENT_DELETED":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-primary-500/10 text-primary-400 border-primary-500/20";
    }
  };

  const getEventLabel = (eventType, _meta) => {
    switch (eventType) {
      case "CREATED":
        return "Created";
      case "STATUS_CHANGED":
        return "Status changed";
      case "ARCHIVED_AUTO":
        return "Auto-archived";
      case "ARCHIVED_MANUAL":
        return "Archived";
      case "RESTORED":
        return "Restored";
      case "DELETED":
        return "Deleted";
      case "UPDATED":
        return "Updated";
      case "COMMENT_CREATED":
        return "Comment added";
      case "COMMENT_UPDATED":
        return "Comment edited";
      case "COMMENT_DELETED":
        return "Comment deleted";
      default:
        return eventType;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start md:items-center justify-center p-0 md:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-full md:max-w-6xl transform overflow-hidden md:rounded-lg bg-dark-900 border-0 md:border border-dark-800 p-4 md:p-6 shadow-xl transition-all min-h-screen md:min-h-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
                  <div className="flex-1 min-w-0">
                    <Dialog.Title className="text-lg md:text-xl font-semibold text-dark-100">
                      {internalTask
                        ? mode === "view"
                          ? formData.title
                          : "Edit Task"
                        : "Create New Task"}
                    </Dialog.Title>
                    {internalTask &&
                      mode === "view" &&
                      internalTask.task_number && (
                        <p className="text-xs text-primary-400 mt-1 font-mono font-semibold">
                          TASK-{internalTask.task_number}
                        </p>
                      )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {internalTask && mode === "view" && (
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded-lg transition-colors text-sm border border-dark-700"
                        title="Copy task link"
                      >
                        {copied ? (
                          <>
                            <CheckIcon className="w-4 h-4 text-green-500" />
                            <span className="hidden sm:inline text-green-500">Copied!</span>
                          </>
                        ) : (
                          <>
                            <ShareIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Share</span>
                          </>
                        )}
                      </button>
                    )}
                    {internalTask &&
                      mode === "view" &&
                      internalTask.status !== TASK_STATUS.ARCHIVE && (
                        <button
                          onClick={() => setMode("edit")}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <PencilIcon className="w-4 h-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                      )}
                    <button
                      onClick={onClose}
                      className="text-dark-400 hover:text-dark-200 transition-colors"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* View Mode */}
                {mode === "view" && internalTask && (
                  <>
                    {/* Main Content */}
                    <div className="space-y-4 md:space-y-6 mb-4 md:mb-6">
                      {/* Description and Metadata - Side by Side */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        {/* Main Column - Description */}
                        <div className="md:col-span-2">
                          {formData.description && (
                            <div>
                              <label className="block text-sm font-medium text-dark-400 mb-2">
                                Description
                              </label>
                              <MarkdownRenderer
                                content={formData.description}
                                size="sm"
                                className="bg-dark-800 p-4 rounded-lg"
                              />
                            </div>
                          )}

                          {tags && tags.length > 0 && (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-dark-400 mb-2">
                                Tags
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary-600/20 text-primary-300 rounded-md text-sm"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column - Metadata */}
                        <div>
                          <label className="block text-sm font-medium text-dark-400 mb-2">
                            Details
                          </label>
                          <div className="bg-dark-800 p-4 rounded-lg space-y-4">
                            <div>
                              <label className="block text-xs font-medium text-dark-500 mb-2 uppercase tracking-wider">
                                Status
                              </label>
                              <span
                                className={classNames(
                                  "inline-block px-2 py-1 text-xs font-medium rounded",
                                  STATUS_CONFIG[formData.status]?.color ||
                                    "bg-dark-700 text-dark-300"
                                )}
                              >
                                {STATUS_CONFIG[formData.status]?.label ||
                                  formData.status}
                              </span>
                            </div>

                            <div className="border-t border-dark-700 pt-4">
                              <label className="block text-xs font-medium text-dark-500 mb-2 uppercase tracking-wider">
                                Priority
                              </label>
                              <span
                                className={classNames(
                                  "inline-block px-2 py-1 text-xs font-medium rounded",
                                  PRIORITY_CONFIG[formData.priority]?.color ||
                                    "bg-dark-700 text-dark-300"
                                )}
                              >
                                {PRIORITY_CONFIG[formData.priority]?.label ||
                                  formData.priority}
                              </span>
                            </div>

                            <div className="border-t border-dark-700 pt-4">
                              <label className="block text-xs font-medium text-dark-500 mb-2 uppercase tracking-wider">
                                Type
                              </label>
                              <span
                                className={classNames(
                                  "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded bg-dark-800",
                                  TASK_TYPE_CONFIG[formData.type]?.color ||
                                    "text-dark-300"
                                )}
                              >
                                {TASK_TYPE_CONFIG[formData.type]?.label ||
                                  formData.type}
                              </span>
                            </div>

                            {formData.assignee_id && (
                              <div className="border-t border-dark-700 pt-4">
                                <label className="block text-xs font-medium text-dark-500 mb-1 uppercase tracking-wider">
                                  Assignee
                                </label>
                                <p className="text-dark-100">
                                  {users.find(
                                    (u) => u.id === formData.assignee_id
                                  )?.name || "Unknown"}
                                </p>
                              </div>
                            )}

                            <div className="border-t border-dark-700 pt-4">
                              <label className="block text-xs font-medium text-dark-500 mb-1 uppercase tracking-wider">
                                Reporter
                              </label>
                              <p className="text-dark-100">
                                {internalTask?.reporter_name || "Not set"}
                              </p>
                            </div>

                            {formData.dueDate && (
                              <div className="border-t border-dark-700 pt-4">
                                <label className="block text-xs font-medium text-dark-500 mb-1 uppercase tracking-wider">
                                  Due Date
                                </label>
                                <p className="text-dark-100">
                                  {new Date(
                                    formData.dueDate
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            )}

                            {internalTask?.created_at && (
                              <div className="border-t border-dark-700 pt-4">
                                <label className="block text-xs font-medium text-dark-500 mb-1 uppercase tracking-wider">
                                  Created At
                                </label>
                                <p className="text-dark-100">
                                  {formatDateTimeLocal(internalTask.created_at)}
                                </p>
                              </div>
                            )}

                            {internalTask?.updated_at && (
                              <div className="border-t border-dark-700 pt-4">
                                <label className="block text-xs font-medium text-dark-500 mb-1 uppercase tracking-wider">
                                  Updated At
                                </label>
                                <p className="text-dark-100">
                                  {formatDateTimeLocal(internalTask.updated_at)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dependencies and Relationships Section */}
                    <div className="grid grid-cols-2 gap-4 mt-6 mb-8">
                      {/* Dependencies */}
                      <div className="bg-dark-800 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-dark-200 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            Dependencies
                          </h3>
                          {mode === "view" && !showAddDependency && (
                            <button
                              onClick={() => {
                                setShowAddDependency(true);
                                loadAvailableTasks();
                              }}
                              className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                            >
                              <PlusCircleIcon className="w-3 h-3" />
                              Add
                            </button>
                          )}
                        </div>

                        {/* Add Dependency Form */}
                        {showAddDependency && (
                          <div className="mb-3 p-3 bg-dark-900 rounded border border-dark-700">
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <label className="block text-xs font-medium text-dark-500 mb-1">
                                  Relationship Type
                                </label>
                                <select
                                  value={dependencyType}
                                  onChange={(e) => setDependencyType(e.target.value)}
                                  className="input-field text-xs"
                                  disabled={isAddingDependency}
                                >
                                  <option value="blocked_by">Blocked By</option>
                                  <option value="is_blocking">Is Blocking</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-dark-500 mb-1">
                                  Select Task
                                </label>
                                <select
                                  value={selectedDependencyTask}
                                  onChange={(e) => setSelectedDependencyTask(e.target.value)}
                                  className="input-field text-xs"
                                  disabled={loadingAvailableTasks || isAddingDependency}
                                >
                                  <option value="">Select a task...</option>
                                  {availableTasks.map((task) => {
                                    const taskType = task.type || TASK_TYPE.TASK;
                                    const typeIcon = TASK_TYPE_UNICODE_ICONS[taskType] || '✓';
                                    const epicInfo = task.parent_task_number ? ` [Epic: TASK-${task.parent_task_number}]` : '';
                                    return (
                                      <option key={task.id} value={task.id}>
                                        {typeIcon} TASK-{task.task_number} - {task.title}{epicInfo}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleAddDependency}
                                disabled={!selectedDependencyTask || isAddingDependency}
                                className="btn-primary text-xs py-1 px-2 flex-1"
                              >
                                {isAddingDependency ? "Adding..." : "Add Dependency"}
                              </button>
                              <button
                                onClick={() => {
                                  setShowAddDependency(false);
                                  setSelectedDependencyTask("");
                                  setDependencyType("blocked_by");
                                }}
                                className="btn-secondary text-xs py-1 px-2"
                                disabled={isAddingDependency}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Blocked By */}
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-dark-500 mb-1">
                            Blocked By
                          </label>
                          
                          {loadingDependencies ? (
                            <p className="text-xs text-dark-500">Loading...</p>
                          ) : dependencies.depends_on.length > 0 ? (
                            <div className="space-y-1">
                              {dependencies.depends_on.map((dep) => {
                                const taskType = dep.type || TASK_TYPE.TASK;
                                const typeConfig = TASK_TYPE_CONFIG[taskType];
                                const TypeIcon = ICON_MAP[typeConfig?.icon];
                                
                                return (
                                  <div
                                    key={dep.id}
                                    className="text-xs text-dark-300 flex items-center gap-2 group"
                                  >
                                    {TypeIcon && (
                                      <TypeIcon 
                                        className={classNames('w-3.5 h-3.5 flex-shrink-0', typeConfig.color)} 
                                        title={typeConfig.label}
                                      />
                                    )}
                                    <button
                                      onClick={async () => {
                                        try {
                                          const task = await useTaskStore.getState().fetchTaskById(dep.id);
                                          onClose();
                                          setTimeout(() => {
                                            window.dispatchEvent(new CustomEvent('openTask', { detail: task }));
                                          }, 100);
                                        } catch (error) {
                                          showToast('Failed to load task', 'error');
                                        }
                                      }}
                                      className="font-mono text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
                                    >
                                      TASK-{dep.task_number}
                                    </button>
                                    <span className="flex-1 truncate">
                                      {dep.title}
                                    </span>
                                    <span
                                      className={classNames(
                                        "px-1.5 py-0.5 rounded text-[10px]",
                                        STATUS_CONFIG[dep.status]?.color ||
                                          "bg-dark-700 text-dark-300"
                                      )}
                                    >
                                      {STATUS_CONFIG[dep.status]?.label ||
                                        dep.status}
                                    </span>
                                    {mode === "view" && (
                                      <button
                                        onClick={() => handleRemoveDependency(dep.id)}
                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                                        title="Remove dependency"
                                      >
                                        <XMarkIcon className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-dark-500">
                              No blocking dependencies
                            </p>
                          )}
                        </div>

                        {/* Blocking */}
                        <div>
                          <label className="block text-xs font-medium text-dark-500 mb-1">
                            Blocking
                          </label>
                          {dependencies.dependents.length > 0 ? (
                            <div className="space-y-1">
                              {dependencies.dependents.map((dep) => {
                                const taskType = dep.type || TASK_TYPE.TASK;
                                const typeConfig = TASK_TYPE_CONFIG[taskType];
                                const TypeIcon = ICON_MAP[typeConfig?.icon];
                                
                                return (
                                  <div
                                    key={dep.id}
                                    className="text-xs text-dark-300 flex items-center gap-2 group"
                                  >
                                    {TypeIcon && (
                                      <TypeIcon 
                                        className={classNames('w-3.5 h-3.5 flex-shrink-0', typeConfig.color)} 
                                        title={typeConfig.label}
                                      />
                                    )}
                                    <button
                                      onClick={async () => {
                                        try {
                                          const task = await useTaskStore.getState().fetchTaskById(dep.id);
                                          onClose();
                                          setTimeout(() => {
                                            window.dispatchEvent(new CustomEvent('openTask', { detail: task }));
                                          }, 100);
                                        } catch (error) {
                                          showToast('Failed to load task', 'error');
                                        }
                                      }}
                                      className="font-mono text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
                                    >
                                      TASK-{dep.task_number}
                                    </button>
                                    <span className="flex-1 truncate">
                                      {dep.title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-dark-500">
                              Not blocking any tasks
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Parent/Epic and Subtasks */}
                      <div className="bg-dark-800 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-dark-200 mb-3">
                          Epic & Subtasks
                        </h3>

                        {/* Parent/Epic */}
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-dark-500 mb-1">
                            Parent Epic
                          </label>
                          {internalTask.parent_task_id ? (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const parentTask = await useTaskStore.getState().fetchTaskById(internalTask.parent_task_id);
                                  // Close current modal and open parent task
                                  onClose();
                                  // Small delay to allow modal to close
                                  setTimeout(() => {
                                    // Trigger opening the parent task by updating the URL or calling parent handler
                                    window.dispatchEvent(new CustomEvent('openTask', { detail: parentTask }));
                                  }, 100);
                                } catch (error) {
                                  showToast('Failed to load parent task', 'error');
                                }
                              }}
                              className="text-xs text-dark-300 hover:text-primary-400 transition-colors text-left"
                            >
                              <span className="font-mono text-primary-400">
                                TASK-{internalTask.parent_task_number || "?"}
                              </span>{" "}
                              {internalTask.parent_task_title || "Loading..."}
                            </button>
                          ) : (
                            <p className="text-xs text-dark-500">
                              No parent epic
                            </p>
                          )}
                        </div>

                        {/* Subtasks */}
                        <div>
                          <label className="block text-xs font-medium text-dark-500 mb-1">
                            Subtasks
                          </label>
                          {loadingSubtasks ? (
                            <p className="text-xs text-dark-500">Loading...</p>
                          ) : subtasks.length > 0 ? (
                            <div className="space-y-1">
                              {subtasks.map((sub) => (
                                <button
                                  key={sub.id}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const subtask = await useTaskStore.getState().fetchTaskById(sub.id);
                                      onClose();
                                      setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('openTask', { detail: subtask }));
                                      }, 100);
                                    } catch (error) {
                                      showToast('Failed to load subtask', 'error');
                                    }
                                  }}
                                  className="text-xs text-dark-300 hover:text-primary-400 transition-colors flex items-center gap-2 w-full text-left"
                                >
                                  <span className="font-mono text-primary-400">
                                    TASK-{sub.task_number}
                                  </span>
                                  <span className="flex-1 truncate">
                                    {sub.title}
                                  </span>
                                  <span
                                    className={classNames(
                                      "px-1.5 py-0.5 rounded text-[10px]",
                                      STATUS_CONFIG[sub.status]?.color ||
                                        "bg-dark-700 text-dark-300"
                                    )}
                                  >
                                    {STATUS_CONFIG[sub.status]?.label ||
                                      sub.status}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-dark-500">No subtasks</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Archive Notices */}
                    {internalTask.status === TASK_STATUS.DONE && (
                      <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg mb-6">
                        <p className="text-sm text-blue-300">
                          This task is marked as Done. It will be automatically
                          archived after 7 days, or you can archive it manually.
                        </p>
                      </div>
                    )}

                    {internalTask.status === TASK_STATUS.ARCHIVE && (
                      <div className="p-3 bg-dark-800 border border-dark-700 rounded-lg mb-6">
                        <p className="text-sm text-dark-300">
                          This task is archived. You can restore it to move it
                          back to Done status.
                        </p>
                      </div>
                    )}

                    {/* Tabs Section */}
                    <Tab.Group
                      selectedIndex={activeTab}
                      onChange={handleTabChange}
                    >
                      <Tab.List className="flex gap-6 border-b border-dark-800 mb-4">
                        <Tab
                          className={({ selected }) =>
                            `pb-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2
                          ${
                            selected
                              ? "border-primary-500 text-primary-400"
                              : "border-transparent text-dark-400 hover:text-dark-200 hover:border-dark-600"
                          }`
                          }
                        >
                          <ChatBubbleLeftRightIcon className="w-4 h-4" />
                          Comments
                        </Tab>
                        <Tab
                          className={({ selected }) =>
                            `pb-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2
                          ${
                            selected
                              ? "border-primary-500 text-primary-400"
                              : "border-transparent text-dark-400 hover:text-dark-200 hover:border-dark-600"
                          }`
                          }
                        >
                          <ClockIcon className="w-4 h-4" />
                          History
                        </Tab>
                        <Tab
                          className={({ selected }) =>
                            `pb-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2
                          ${
                            selected
                              ? "border-primary-500 text-primary-400"
                              : "border-transparent text-dark-400 hover:text-dark-200 hover:border-dark-600"
                          }`
                          }
                        >
                          <BoltIcon className="w-4 h-4" />
                          Activity
                        </Tab>
                      </Tab.List>
                      <Tab.Panels>
                        {/* Comments Panel */}
                        <Tab.Panel>
                          <div className="space-y-4 min-h-[200px]">
                            {!internalTask || mode !== "view" ? (
                              <div className="text-center py-12">
                                <p className="text-dark-400">
                                  Save this task to start a comment thread
                                </p>
                              </div>
                            ) : (
                              <>
                                {/* Composer */}
                                <div className="p-4 bg-dark-800/40 border border-dark-700/50 rounded-lg">
                                  <label className="block text-xs font-medium text-dark-500 mb-2 uppercase tracking-wider">
                                    Add comment
                                  </label>
                                  <textarea
                                    value={commentDraft}
                                    onChange={(e) =>
                                      setCommentDraft(e.target.value)
                                    }
                                    rows={3}
                                    placeholder="Write a comment..."
                                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                                  />
                                  <div className="mt-3 flex items-center justify-between gap-3">
                                    <p className="text-xs text-dark-500">
                                      {commentDraft.trim().length}/5000
                                    </p>
                                    <button
                                      type="button"
                                      onClick={handlePostComment}
                                      disabled={isPostingComment}
                                      className={classNames(
                                        "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                        isPostingComment
                                          ? "bg-dark-700 text-dark-400 cursor-not-allowed"
                                          : "bg-primary-600 hover:bg-primary-500 text-white"
                                      )}
                                    >
                                      {isPostingComment ? (
                                        <>
                                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                          Posting...
                                        </>
                                      ) : (
                                        <>
                                          <PlusCircleIcon className="w-4 h-4" />
                                          Post
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* List */}
                                {loadingComments ? (
                                  <div className="flex items-center justify-center py-10">
                                    <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                  </div>
                                ) : comments.length === 0 ? (
                                  <div className="text-center py-10">
                                    <p className="text-dark-400">
                                      No comments yet
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {comments.map((comment) => {
                                      const isAuthor =
                                        currentUser?.id === comment.author_id;
                                      const isAdminOrOwner =
                                        currentUser?.role === "admin" ||
                                        currentUser?.role === "owner";
                                      const canEdit =
                                        isAuthor || isAdminOrOwner;
                                      const isEditing =
                                        editingCommentId === comment.id;

                                      return (
                                        <div
                                          key={comment.id}
                                          className="p-4 bg-dark-800/50 rounded-lg border border-dark-700/50 hover:border-dark-600/50 transition-colors"
                                        >
                                          <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-semibold text-dark-100 truncate">
                                                {comment.author_name ||
                                                  "Unknown"}
                                              </p>
                                              <p className="text-xs text-dark-500">
                                                {comment.author_email || "—"}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <time className="text-xs text-dark-500 whitespace-nowrap">
                                                {comment.created_at
                                                  ? formatDateTimeLocal(
                                                      comment.created_at
                                                    )
                                                  : ""}
                                              </time>
                                              {canEdit && !isEditing && (
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleEditComment(comment)
                                                    }
                                                    className="p-1 text-dark-400 hover:text-primary-400 transition-colors"
                                                    title="Edit comment"
                                                  >
                                                    <PencilIcon className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleDeleteComment(
                                                        comment.id
                                                      )
                                                    }
                                                    disabled={
                                                      isDeletingCommentId ===
                                                      comment.id
                                                    }
                                                    className="p-1 text-dark-400 hover:text-red-400 transition-colors disabled:opacity-50"
                                                    title="Delete comment"
                                                  >
                                                    {isDeletingCommentId ===
                                                    comment.id ? (
                                                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                      <TrashIcon className="w-4 h-4" />
                                                    )}
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {isEditing ? (
                                            <div className="space-y-2">
                                              <textarea
                                                value={editingCommentBody}
                                                onChange={(e) =>
                                                  setEditingCommentBody(
                                                    e.target.value
                                                  )
                                                }
                                                rows={3}
                                                className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                                              />
                                              <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs text-dark-500">
                                                  {
                                                    editingCommentBody.trim()
                                                      .length
                                                  }
                                                  /5000
                                                </p>
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    type="button"
                                                    onClick={handleCancelEdit}
                                                    disabled={isUpdatingComment}
                                                    className="px-3 py-1.5 text-sm text-dark-300 hover:text-dark-100 transition-colors disabled:opacity-50"
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleUpdateComment(
                                                        comment.id
                                                      )
                                                    }
                                                    disabled={isUpdatingComment}
                                                    className={classNames(
                                                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                                      isUpdatingComment
                                                        ? "bg-dark-700 text-dark-400 cursor-not-allowed"
                                                        : "bg-primary-600 hover:bg-primary-500 text-white"
                                                    )}
                                                  >
                                                    {isUpdatingComment ? (
                                                      <>
                                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                        Saving...
                                                      </>
                                                    ) : (
                                                      <>
                                                        <CheckIcon className="w-4 h-4" />
                                                        Save
                                                      </>
                                                    )}
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <MarkdownRenderer
                                              content={comment.body}
                                              size="sm"
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </Tab.Panel>

                        {/* History Panel */}
                        <Tab.Panel>
                          {loadingHistory ? (
                            <div className="flex items-center justify-center py-12">
                              <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : history.length === 0 ? (
                            <div className="text-center py-12">
                              <p className="text-dark-400">
                                No history available
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                              {history.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="flex gap-4 p-4 bg-dark-800/50 rounded-lg border border-dark-700/50 hover:border-dark-600/50 transition-colors"
                                >
                                  {/* Icon */}
                                  <div
                                    className={classNames(
                                      "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border",
                                      getEventColor(
                                        entry.event_type,
                                        entry.meta
                                      )
                                    )}
                                  >
                                    {getEventIcon(entry.event_type, entry.meta)}
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex-1">
                                        <p className="font-semibold text-dark-100 text-sm">
                                          {getEventLabel(
                                            entry.event_type,
                                            entry.meta
                                          )}
                                        </p>
                                        <p className="text-xs text-dark-400 mt-0.5">
                                          by {entry.actor_name || "System"}
                                        </p>
                                      </div>
                                      <time className="text-xs text-dark-500 whitespace-nowrap">
                                        {formatDateTimeLocal(entry.occurred_at)}
                                      </time>
                                    </div>

                                    {/* Changes */}
                                    {formatHistoryEntry(entry).length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-dark-700/50">
                                        <div className="space-y-3">
                                          {formatHistoryEntry(entry).map(
                                            (change, idx) => {
                                              const oldIsLong = isLongText(
                                                change.oldValue
                                              );
                                              const newIsLong = isLongText(
                                                change.newValue
                                              );
                                              const anyLong =
                                                oldIsLong || newIsLong;
                                              const isSummary =
                                                change.field === "summary";

                                              return (
                                                <div
                                                  key={idx}
                                                  className="space-y-2"
                                                >
                                                  <p className="text-xs font-medium text-dark-400 uppercase tracking-wide">
                                                    {change.field}
                                                  </p>

                                                  {anyLong ? (
                                                    // Stacked layout for long text
                                                    <div className="space-y-2">
                                                      <div className="bg-red-900/10 border border-red-800/30 rounded p-2">
                                                        <p className="text-[10px] font-medium text-red-400 mb-1 uppercase tracking-wide">
                                                          Old
                                                        </p>
                                                        {isSummary &&
                                                        change.oldValue ? (
                                                          <MarkdownRenderer
                                                            content={String(change.oldValue)}
                                                            size="xs"
                                                            className="text-dark-300"
                                                          />
                                                        ) : (
                                                          <p className="text-xs text-dark-300 whitespace-pre-wrap break-words">
                                                            {formatValue(
                                                              change.oldValue,
                                                              true,
                                                              change.fieldKey,
                                                              true
                                                            )}
                                                          </p>
                                                        )}
                                                      </div>
                                                      <div className="bg-green-900/10 border border-green-800/30 rounded p-2">
                                                        <p className="text-[10px] font-medium text-green-400 mb-1 uppercase tracking-wide">
                                                          New
                                                        </p>
                                                        {isSummary &&
                                                        change.newValue ? (
                                                          <MarkdownRenderer
                                                            content={String(change.newValue)}
                                                            size="xs"
                                                            className="text-dark-300"
                                                          />
                                                        ) : (
                                                          <p className="text-xs text-dark-300 whitespace-pre-wrap break-words">
                                                            {formatValue(
                                                              change.newValue,
                                                              true,
                                                              change.fieldKey,
                                                              false
                                                            )}
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    // Side-by-side layout for short text
                                                    <div className="grid grid-cols-2 gap-2">
                                                      <div className="bg-red-900/10 border border-red-800/30 rounded p-2">
                                                        <p className="text-[10px] font-medium text-red-400 mb-1 uppercase tracking-wide">
                                                          Old
                                                        </p>
                                                        {isSummary &&
                                                        change.oldValue ? (
                                                          <MarkdownRenderer
                                                            content={String(change.oldValue)}
                                                            size="xs"
                                                            className="text-dark-300"
                                                          />
                                                        ) : (
                                                          <p className="text-xs text-dark-300 break-words">
                                                            {formatValue(
                                                              change.oldValue,
                                                              true,
                                                              change.fieldKey,
                                                              true
                                                            )}
                                                          </p>
                                                        )}
                                                      </div>
                                                      <div className="bg-green-900/10 border border-green-800/30 rounded p-2">
                                                        <p className="text-[10px] font-medium text-green-400 mb-1 uppercase tracking-wide">
                                                          New
                                                        </p>
                                                        {isSummary &&
                                                        change.newValue ? (
                                                          <MarkdownRenderer
                                                            content={String(change.newValue)}
                                                            size="xs"
                                                            className="text-dark-300"
                                                          />
                                                        ) : (
                                                          <p className="text-xs text-dark-300 break-words">
                                                            {formatValue(
                                                              change.newValue,
                                                              true,
                                                              change.fieldKey,
                                                              false
                                                            )}
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            }
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </Tab.Panel>

                        {/* Activity Panel */}
                        <Tab.Panel>
                          {loadingActivity ? (
                            <div className="flex items-center justify-center py-12">
                              <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : activity.length === 0 ? (
                            <div className="text-center py-12">
                              <p className="text-dark-400">
                                No bot activity for this task yet
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                              {activity.map((entry) => {
                                const date = parseDatabaseDate(entry.timestamp);
                                const timeLabel = format(date, "MMM d, h:mm a");

                                const categoryColors = {
                                  heartbeat:
                                    "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
                                  implementation:
                                    "bg-blue-500/20 border-blue-500/50 text-blue-400",
                                  improvement:
                                    "bg-green-500/20 border-green-500/50 text-green-400",
                                  bug_fix:
                                    "bg-red-500/20 border-red-500/50 text-red-400",
                                  refactor:
                                    "bg-purple-500/20 border-purple-500/50 text-purple-400",
                                  feature:
                                    "bg-green-500/20 border-green-500/50 text-green-400",
                                  planning:
                                    "bg-purple-500/20 border-purple-500/50 text-purple-400",
                                  deployment:
                                    "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
                                  testing:
                                    "bg-blue-500/20 border-blue-500/50 text-blue-400",
                                  maintenance:
                                    "bg-green-500/20 border-green-500/50 text-green-400",
                                };

                                const categoryColor =
                                  categoryColors[entry.category] ||
                                  "bg-primary-500/20 border-primary-500/50 text-primary-400";

                                return (
                                  <div
                                    key={entry.id}
                                    className="p-4 bg-dark-800/50 rounded-lg border border-dark-700/50 hover:border-dark-600/50 transition-colors"
                                  >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <h4 className="font-semibold text-dark-100 text-sm">
                                        {entry.title}
                                      </h4>
                                      {entry.category && (
                                        <span
                                          className={`px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${categoryColor}`}
                                        >
                                          {entry.category.replace("_", " ")}
                                        </span>
                                      )}
                                    </div>
                                    <MarkdownRenderer
                                      content={entry.description}
                                      size="xs"
                                      className="text-dark-400 mb-3"
                                    />
                                    <time className="text-xs text-dark-500">
                                      {timeLabel}
                                    </time>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Tab.Panel>
                      </Tab.Panels>
                    </Tab.Group>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-6 border-t border-dark-800 mt-6">
                      <div className="flex gap-3">
                        {internalTask.status === TASK_STATUS.ARCHIVE && (
                          <button
                            type="button"
                            onClick={handleRestore}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                          >
                            Restore Task
                          </button>
                        )}
                        {internalTask.status === TASK_STATUS.DONE && (
                          <button
                            type="button"
                            onClick={handleArchive}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                          >
                            Archive Task
                          </button>
                        )}
                        {internalTask.status !== TASK_STATUS.ARCHIVE && (
                          <button
                            type="button"
                            onClick={handleDelete}
                            className="px-4 py-2 text-red-500 hover:text-red-400 font-medium transition-colors"
                          >
                            Delete Task
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}

                {/* Edit Mode Form */}
                {mode === "edit" && (
                  <form onSubmit={handleSubmit} className="relative">
                    {/* Loading Overlay */}
                    {isSubmitting && (
                      <div className="absolute inset-0 bg-dark-900/50 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-dark-200 font-medium">
                            {internalTask
                              ? "Updating task..."
                              : "Creating task..."}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      {/* Main Column - Title and Description */}
                      <div className="md:col-span-2 space-y-4">
                        {/* Title */}
                        <div>
                          <label
                            htmlFor="title"
                            className="block text-sm font-medium text-dark-300 mb-2"
                          >
                            Title *
                          </label>
                          <input
                            type="text"
                            id="title"
                            name="title"
                            required
                            value={formData.title}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter task title"
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <label
                            htmlFor="description"
                            className="block text-sm font-medium text-dark-300 mb-2"
                          >
                            Description
                          </label>
                          <textarea
                            id="description"
                            name="description"
                            rows={16}
                            value={formData.description}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter task description (supports Markdown)"
                          />
                        </div>
                      </div>

                      {/* Right Column - Metadata */}
                      <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                          Details
                        </label>
                        <div className="bg-dark-800 p-4 rounded-lg space-y-4">
                          {/* Status - Only show when editing existing task */}
                          {internalTask && (
                            <div>
                              <label
                                htmlFor="status"
                                className="block text-xs font-medium text-dark-500 mb-2 uppercase tracking-wider"
                              >
                                Status
                              </label>
                              <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="input-field"
                                disabled={
                                  internalTask.status === TASK_STATUS.ARCHIVE
                                }
                              >
                                <option value={TASK_STATUS.PLANNING}>
                                  Planning
                                </option>
                                <option value={TASK_STATUS.TODO}>To Do</option>
                                <option value={TASK_STATUS.IN_PROGRESS}>
                                  In Progress
                                </option>
                                <option value={TASK_STATUS.DONE}>Done</option>
                              </select>
                            </div>
                          )}

                          {/* Priority */}
                          <div>
                            <label
                              htmlFor="priority"
                              className="block text-xs font-medium text-dark-500 mb-2 uppercase tracking-wider"
                            >
                              Priority
                            </label>
                            <select
                              id="priority"
                              name="priority"
                              value={formData.priority}
                              onChange={handleChange}
                              className="input-field"
                            >
                              <option value={TASK_PRIORITY.HIGH}>High</option>
                              <option value={TASK_PRIORITY.MEDIUM}>
                                Medium
                              </option>
                              <option value={TASK_PRIORITY.LOW}>Low</option>
                            </select>
                          </div>

                          {/* Type */}
                          <div>
                            <label
                              htmlFor="type"
                              className="block text-xs font-medium text-dark-500 mb-2 uppercase tracking-wider"
                            >
                              Type
                            </label>
                            <select
                              id="type"
                              name="type"
                              value={formData.type}
                              onChange={handleChange}
                              className="input-field"
                            >
                              <option value={TASK_TYPE.TASK}>Task</option>
                              <option value={TASK_TYPE.BUG}>Bug</option>
                              <option value={TASK_TYPE.FEATURE}>Feature</option>
                              <option value={TASK_TYPE.IMPROVEMENT}>
                                Improvement
                              </option>
                              <option value={TASK_TYPE.RESEARCH}>
                                Research
                              </option>
                              <option value={TASK_TYPE.EPIC}>Epic</option>
                            </select>
                          </div>

                          {/* Due Date */}
                          <div>
                            <label
                              htmlFor="dueDate"
                              className="block text-xs font-medium text-dark-500 mb-2 uppercase tracking-wider"
                            >
                              Due Date
                            </label>
                            <input
                              type="date"
                              id="dueDate"
                              name="dueDate"
                              value={formData.dueDate}
                              onChange={handleChange}
                              className="input-field"
                            />
                          </div>

                          {/* Parent Epic */}
                          <div>
                            <label
                              htmlFor="parent_task_id"
                              className="block text-xs font-medium text-dark-500 mb-2 uppercase tracking-wider"
                            >
                              Parent Epic
                            </label>
                            <select
                              id="parent_task_id"
                              name="parent_task_id"
                              value={formData.parent_task_id}
                              onChange={handleChange}
                              className="input-field"
                            >
                              <option value="">None</option>
                              {loadingEpics ? (
                                <option disabled>Loading epics...</option>
                              ) : (
                                epicTasks.map((epic) => (
                                  <option key={epic.id} value={epic.id}>
                                    TASK-{epic.task_number} - {epic.title}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          {/* Assignee */}
                          <div>
                            <label
                              htmlFor="assignee_id"
                              className="block text-xs font-medium text-dark-500 mb-2 uppercase tracking-wider"
                            >
                              Assignee
                            </label>
                            <select
                              id="assignee_id"
                              name="assignee_id"
                              value={formData.assignee_id}
                              onChange={handleChange}
                              className="input-field"
                            >
                              <option value="">None</option>
                              {loadingUsers ? (
                                <option disabled>Loading users...</option>
                              ) : (
                                users.map((user) => (
                                  <option key={user.id} value={user.id}>
                                    {user.name}{" "}
                                    {user.email ? `(${user.email})` : ""}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          {/* Reporter (read-only in edit mode) */}
                          {internalTask && (
                            <div>
                              <label className="block text-xs font-medium text-dark-500 mb-1 uppercase tracking-wider">
                                Reporter
                              </label>
                              <p className="text-dark-300 text-sm">
                                {internalTask.reporter_name || "Not set"}
                              </p>
                            </div>
                          )}

                          {/* Tags */}
                          <div className="relative">
                            <label
                              htmlFor="tags"
                              className="block text-xs font-medium text-dark-500 mb-2 uppercase tracking-wider"
                            >
                              Tags
                            </label>
                            <div className="space-y-2">
                              {/* Tag chips */}
                              {tags && tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {tags.map((tag, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-600/20 text-primary-300 rounded-md text-sm border border-primary-600/30"
                                    >
                                      <span>{tag}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeTag(index)}
                                        className="text-primary-400 hover:text-primary-200 transition-colors"
                                        aria-label={`Remove tag ${tag}`}
                                      >
                                        <XMarkIcon className="w-3.5 h-3.5" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Tag input */}
                              <div className="relative">
                                <input
                                  type="text"
                                  id="tags"
                                  name="tags"
                                  value={tagInput}
                                  onChange={handleTagInputChange}
                                  onKeyDown={handleTagInputKeyDown}
                                  onFocus={() => {
                                    if (
                                      tagInput.trim() &&
                                      tagSuggestions &&
                                      tagSuggestions.length > 0
                                    ) {
                                      setShowSuggestions(true);
                                    }
                                  }}
                                  onBlur={() => {
                                    // Delay hiding suggestions to allow clicking on them
                                    setTimeout(
                                      () => setShowSuggestions(false),
                                      200
                                    );
                                  }}
                                  className="input-field"
                                  placeholder="Enter tags separated by spaces"
                                />

                                {/* Suggestions dropdown */}
                                {showSuggestions &&
                                  tagSuggestions &&
                                  tagSuggestions.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-dark-800 border border-dark-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                      {tagSuggestions.map(
                                        (suggestion, index) => (
                                          <button
                                            key={index}
                                            type="button"
                                            onClick={() =>
                                              selectSuggestion(suggestion)
                                            }
                                            className="w-full text-left px-4 py-2 text-sm text-dark-200 hover:bg-dark-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                          >
                                            {suggestion}
                                          </button>
                                        )
                                      )}
                                    </div>
                                  )}
                              </div>

                              <p className="text-xs text-dark-500">
                                Press Space or Enter to add a tag
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Archive Notices */}
                    {internalTask &&
                      internalTask.status === TASK_STATUS.DONE && (
                        <div className="col-span-3 p-3 bg-blue-900/20 border border-blue-800 rounded-lg mt-4">
                          <p className="text-sm text-blue-300">
                            This task is marked as Done. It will be
                            automatically archived after 7 days, or you can
                            archive it manually.
                          </p>
                        </div>
                      )}

                    {internalTask &&
                      internalTask.status === TASK_STATUS.ARCHIVE && (
                        <div className="col-span-3 p-3 bg-dark-800 border border-dark-700 rounded-lg mt-4">
                          <p className="text-sm text-dark-300">
                            This task is archived. You can restore it to move it
                            back to Done status.
                          </p>
                        </div>
                      )}

                    {/* Actions */}
                    <div className="col-span-3 flex items-center justify-between pt-6 border-t border-dark-800 mt-6">
                      <div className="flex gap-3">
                        {internalTask &&
                          internalTask.status !== TASK_STATUS.ARCHIVE && (
                            <button
                              type="button"
                              onClick={handleDelete}
                              disabled={isSubmitting}
                              className="px-4 py-2 text-red-500 hover:text-red-400 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Delete Task
                            </button>
                          )}
                      </div>
                      <div className="flex gap-3">
                        {internalTask && (
                          <button
                            type="button"
                            onClick={() => setMode("view")}
                            disabled={isSubmitting}
                            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        )}
                        {!internalTask && (
                          <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        )}
                        {internalTask?.status !== TASK_STATUS.ARCHIVE && (
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isSubmitting && (
                              <svg
                                className="animate-spin h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                            )}
                            {isSubmitting
                              ? internalTask
                                ? "Updating..."
                                : "Creating..."
                              : internalTask
                              ? "Update Task"
                              : "Create Task"}
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
