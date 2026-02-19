import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { FolderIcon, FolderOpenIcon } from '@heroicons/react/24/outline';
import Header from '../components/Header';
import WorkspaceExplorer from '../components/WorkspaceExplorer';
import { useAgentStore } from '../stores/agentStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { classNames } from '../utils/helpers';

const AGENT_ID = 'skills';
const ROOT_PATH = '/shared/skills';

function SkillsList({ selectedSkill, onSelect }) {
  const { listings, fetchListing, isLoadingListing } = useWorkspaceStore();
  const navigate = useNavigate();
  const cacheKey = `${AGENT_ID}:/:false`;
  const listing = listings[cacheKey];
  const skills = (listing?.files || []).filter(
    (f) => f.type === 'directory' && f.name !== '.gitkeep'
  );

  useEffect(() => {
    if (!listing && !isLoadingListing) {
      fetchListing({ path: '/', agentId: AGENT_ID }).catch(() => {});
    }
  }, [listing, isLoadingListing, fetchListing]);

  const handleSelect = useCallback(
    (skill) => {
      onSelect(skill);
      navigate(`/skills${skill.path}/`);
    },
    [onSelect, navigate]
  );

  return (
    <div className="py-2">
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-dark-500">
        Skills
      </p>
      {isLoadingListing && !listing ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : skills.length === 0 ? (
        <p className="px-3 py-2 text-sm text-dark-500">No skills yet</p>
      ) : (
        skills.map((skill) => {
          const isActive = selectedSkill?.path === skill.path;
          return (
            <button
              key={skill.path}
              onClick={() => handleSelect(skill)}
              className={classNames(
                'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors rounded-md',
                isActive
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100'
              )}
            >
              {isActive ? (
                <FolderOpenIcon className="w-4 h-4 flex-shrink-0 text-yellow-500" />
              ) : (
                <FolderIcon className="w-4 h-4 flex-shrink-0 text-yellow-500" />
              )}
              <span className="truncate">{skill.name}</span>
            </button>
          );
        })
      )}
    </div>
  );
}

export default function Skills() {
  const { '*': filePathParam } = useParams();
  const { fetchAgents } = useAgentStore();
  const { createDirectory, setWorkspaceRootPath } = useWorkspaceStore();
  const { isAdmin } = useAuthStore();
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [ensureComplete, setEnsureComplete] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const ensureDir = async () => {
      if (isEnsuring || ensureComplete) return;
      setIsEnsuring(true);
      setWorkspaceRootPath(ROOT_PATH);
      try {
        if (isAdmin()) {
          await createDirectory({ path: '/', agentId: AGENT_ID });
        }
      } catch {
        // Directory likely already exists (409) — that's fine
      } finally {
        setIsEnsuring(false);
        setEnsureComplete(true);
      }
    };
    ensureDir();
  }, [createDirectory, setWorkspaceRootPath, isAdmin, isEnsuring, ensureComplete]);

  // Derive the active skill from the URL path so direct links highlight correctly
  useEffect(() => {
    if (filePathParam) {
      const firstSegment = filePathParam.split('/').filter(Boolean)[0];
      if (firstSegment) {
        setSelectedSkill({ path: `/${firstSegment}`, name: firstSegment, type: 'directory' });
      }
    }
  }, [filePathParam]);

  const leftPaneTop = (
    <SkillsList
      selectedSkill={selectedSkill}
      onSelect={setSelectedSkill}
    />
  );

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Skills"
        subtitle="Shared skills space for all agents"
      />

      <div className="flex-1 flex flex-col p-3 md:p-6 overflow-hidden">
        {ensureComplete ? (
          <WorkspaceExplorer
            agentId={AGENT_ID}
            agent={{
              id: AGENT_ID,
              name: 'Skills',
              workspaceRootPath: ROOT_PATH,
              icon: '🧠',
            }}
            initialFilePath={filePathParam || null}
            routeBase="/skills"
            showAgentSelector={false}
            workspaceRootPath={ROOT_PATH}
            leftPaneTop={leftPaneTop}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-dark-400">Setting up skills space...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
