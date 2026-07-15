import React from 'react';
import { 
  Settings, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  History, 
  Copy, 
  Edit3, 
  Save 
} from 'lucide-react';

export default function SystemPromptPanel({
  systemPrompts,
  isFetchingPrompt,
  isSavingPrompt,
  promptError,
  promptSuccessMessage,
  selectedHistoryPrompt,
  setSelectedHistoryPrompt,
  isEditingPrompt,
  setIsEditingPrompt,
  editPromptText,
  setEditPromptText,
  handleSavePrompt,
  handleActivatePrompt,
  handleDeletePrompt,
  fetchSystemPrompt
}) {
  return (
    <div className="flex flex-grow h-full overflow-y-auto lg:overflow-hidden p-4 sm:p-6 flex-col">
      {/* System Prompt Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border-color mb-4 sm:mb-6 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-accent-emerald" />
          <div>
            <h2 className="text-md font-semibold text-white font-sans">System Prompt Manager</h2>
            <p className="text-xs text-gray-400 hidden sm:block">Configure instructions and rules that control the AI assistant's personality and tools.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchSystemPrompt}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition"
            title="Reload prompts from database"
          >
            <RefreshCw size={12} className={isFetchingPrompt ? 'animate-spin' : ''} /> Reload
          </button>
        </div>
      </div>

      {/* Alert Logs */}
      {promptError && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2 items-center flex-shrink-0 animate-fadeIn">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{promptError}</span>
        </div>
      )}
      {promptSuccessMessage && (
        <div className="mb-4 p-4 bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald rounded-xl text-xs flex gap-2 items-center flex-shrink-0 animate-fadeIn">
          <CheckCircle size={14} className="flex-shrink-0" />
          <span>{promptSuccessMessage}</span>
        </div>
      )}

      {/* Side-by-Side Prompt layout */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 overflow-hidden h-full min-h-0">
        {/* Left Side: Revision History */}
        <div className="flex flex-col bg-white/5 border border-white/5 rounded-2xl p-4 sm:p-5 overflow-hidden max-h-64 lg:max-h-none lg:h-full">
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <History className="w-4 h-4 text-accent-mono" />
            <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Revision History</span>
            <span className="ml-auto px-2 py-0.5 bg-white/5 rounded-full font-mono text-[10px] text-gray-400">
              {systemPrompts.history?.length || 0}
            </span>
          </div>

          <div className="flex-grow overflow-y-auto overflow-x-auto pr-1">
            {isFetchingPrompt && systemPrompts.history?.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-12 flex flex-col items-center gap-2">
                <RefreshCw size={16} className="animate-spin text-accent-mono" />
                Loading revisions...
              </div>
            ) : systemPrompts.history?.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-12">No history recorded yet.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] text-gray-400 border-b border-white/10">
                    <th className="font-semibold py-3 px-3 rounded-l-xl text-left">Revision</th>
                    <th className="font-semibold py-3 px-3 text-left">Preview</th>
                    <th className="font-semibold py-3 px-3 text-left">Status</th>
                    <th className="font-semibold py-3 px-3 text-left">Date</th>
                    <th className="font-semibold py-3 px-3 rounded-r-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {systemPrompts.history.map((item) => {
                    const isActive = item.is_active === 1;
                    const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return (
                      <tr key={item.id} className={`hover:bg-white/[0.02] border-b border-white/5 transition-all ${isActive ? 'bg-accent-emerald/[0.02]' : ''}`}>
                        <td className="py-3 px-3 font-mono font-bold text-white">#{item.id}</td>
                        <td className="py-3 px-3 text-gray-400 max-w-[150px] truncate" title={item.prompt}>{item.prompt}</td>
                        <td className="py-3 px-3">
                          <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-full ${isActive ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20' : 'bg-white/5 text-gray-400 border border-white/5'}`}>
                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-[10px] whitespace-nowrap">{dateStr}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex gap-2.5 justify-end">
                            <button
                              onClick={() => setSelectedHistoryPrompt(item)}
                              className="text-accent-blue hover:underline font-semibold bg-transparent border-0 cursor-pointer p-0 text-[11px]"
                            >
                              Details
                            </button>
                            {!isActive && (
                              <>
                                <button
                                  onClick={() => handleActivatePrompt(item.id)}
                                  className="text-accent-emerald hover:underline font-semibold bg-transparent border-0 cursor-pointer p-0 text-[11px]"
                                >
                                  Activate
                                </button>
                                <button
                                  onClick={() => handleDeletePrompt(item.id)}
                                  className="text-red-400 hover:text-red-300 font-semibold bg-transparent border-0 cursor-pointer p-0 text-[11px]"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Active Prompt Editor */}
        <div className="lg:col-span-2 flex flex-col bg-white/5 border border-white/5 rounded-2xl p-4 sm:p-5 overflow-hidden min-h-64 lg:h-full">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-emerald shadow-[0_0_8px_var(--color-accent-emerald)] animate-pulse"></span>
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Active System Prompt</span>
            </div>
            {!isEditingPrompt ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(systemPrompts.activePrompt?.prompt || '');
                    alert('System prompt copied to clipboard!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition text-gray-300 hover:text-white"
                >
                  <Copy size={12} /> Copy Prompt
                </button>
                <button
                  onClick={() => {
                    setEditPromptText(systemPrompts.activePrompt?.prompt || '');
                    setIsEditingPrompt(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 hover:bg-accent-emerald/20 rounded-lg text-xs font-semibold transition"
                >
                  <Edit3 size={12} /> Edit Prompt
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditingPrompt(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePrompt}
                  disabled={isSavingPrompt || !editPromptText.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-emerald text-white rounded-lg text-xs font-semibold transition hover:bg-accent-emerald/80 disabled:opacity-50"
                >
                  <Save size={12} /> {isSavingPrompt ? 'Saving...' : 'Save as New Revision'}
                </button>
              </div>
            )}
          </div>

          <div className="flex-grow overflow-hidden flex flex-col">
            {isEditingPrompt ? (
              <textarea
                value={editPromptText}
                onChange={(e) => setEditPromptText(e.target.value)}
                className="w-full flex-grow p-4 bg-black/40 border border-white/10 rounded-xl font-mono text-xs text-gray-200 outline-none focus:border-accent-emerald/50 resize-none overflow-y-auto leading-relaxed"
                placeholder="Enter system prompt guidelines here..."
              />
            ) : (
              <div className="w-full flex-grow p-4 bg-black/30 border border-white/5 rounded-xl font-mono text-xs text-gray-300 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                {systemPrompts.activePrompt?.prompt || 'No active system prompt found.'}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Historical Prompt Details Modal */}
      {selectedHistoryPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-bg-secondary border border-border-color rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border-color flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-md font-semibold text-white">Revision #{selectedHistoryPrompt.id} Details</h3>
                <span className="text-[10px] text-gray-400 font-mono">Created on {new Date(selectedHistoryPrompt.created_at).toLocaleString()}</span>
              </div>
              <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full ${selectedHistoryPrompt.is_active === 1 ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-white/5 text-gray-400'}`}>
                {selectedHistoryPrompt.is_active === 1 ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            
            <div className="flex-grow overflow-y-auto p-6 font-mono text-xs text-gray-300 whitespace-pre-wrap select-text leading-relaxed bg-black/20">
              {selectedHistoryPrompt.prompt}
            </div>
            
            <div className="p-4 border-t border-border-color flex justify-between items-center bg-bg-secondary/80 flex-shrink-0">
              <div className="flex gap-2">
                {selectedHistoryPrompt.is_active !== 1 && (
                  <button
                    onClick={() => {
                      handleActivatePrompt(selectedHistoryPrompt.id);
                      setSelectedHistoryPrompt(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-emerald text-white rounded-lg text-xs font-semibold transition hover:bg-accent-emerald/80"
                  >
                    Activate Revision
                  </button>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedHistoryPrompt.prompt);
                    alert('Revision copied to clipboard!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition"
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
              <button
                onClick={() => setSelectedHistoryPrompt(null)}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
