import SessionRow from './SessionRow';

export default function SessionList({ sessions, title, emptyMessage = 'No sessions', onSessionClick }) {
  return (
    <div className="bg-dark-900 border border-dark-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-dark-100 mb-5">{title}</h3>
      {sessions.length === 0 ? (
        <p className="text-sm text-dark-500 text-center py-8">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} onClick={onSessionClick} />
          ))}
        </div>
      )}
    </div>
  );
}
