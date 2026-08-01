import React, { useState, useEffect } from 'react';
import { X, Play, Layers, Star, Plus, Edit3, Trash2, Save, Search, Code, Terminal, Sparkles, Sliders } from 'lucide-react';

export default function PrebuiltFormsModal({ isOpen, onClose, onSelectForm }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Mode States: null = list, 'edit' = creating/editing, 'runner' = executing form inputs
  const [mode, setMode] = useState(null);
  const [targetForm, setTargetForm] = useState(null);

  // Form Editor State
  const [editorTitle, setEditorTitle] = useState('');
  const [editorCategory, setEditorCategory] = useState('General');
  const [editorDescription, setEditorDescription] = useState('');
  const [editorPromptTemplate, setEditorPromptTemplate] = useState('');
  const [editorInputs, setEditorInputs] = useState([]);

  // Form Runner Inputs State
  const [runnerInputValues, setRunnerInputValues] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchForms();
      setMode(null);
      setTargetForm(null);
    }
  }, [isOpen]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/prebuilt-forms');
      const data = await res.json();
      if (data.success && Array.isArray(data.forms)) {
        setForms(data.forms);
      }
    } catch (err) {
      console.error('Failed to fetch prebuilt forms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/prebuilt-forms/${id}/toggle-favorite`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setForms(forms.map(f => (f._id === id || f.id === id) ? { ...f, isFavorite: !f.isFavorite } : f));
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleDeleteForm = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this action card?')) return;
    try {
      const res = await fetch(`/api/prebuilt-forms/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setForms(forms.filter(f => (f._id !== id && f.id !== id)));
      }
    } catch (err) {
      console.error('Error deleting form:', err);
    }
  };

  // Editor Actions
  const handleStartCreate = () => {
    setEditorTitle('');
    setEditorCategory('General');
    setEditorDescription('');
    setEditorPromptTemplate('');
    setEditorInputs([]);
    setTargetForm({ id: 'new' });
    setMode('edit');
  };

  const handleStartEdit = (e, form) => {
    e.stopPropagation();
    setEditorTitle(form.title || '');
    setEditorCategory(form.category || 'General');
    setEditorDescription(form.description || '');
    setEditorPromptTemplate(form.promptTemplate || form.prompt || '');
    setEditorInputs(Array.isArray(form.inputs) ? form.inputs : []);
    setTargetForm(form);
    setMode('edit');
  };

  const handleAddEditorInput = () => {
    setEditorInputs([
      ...editorInputs,
      { name: `input_${editorInputs.length + 1}`, label: `Parameter ${editorInputs.length + 1}`, type: 'text', defaultValue: '' }
    ]);
  };

  const handleUpdateEditorInput = (index, field, value) => {
    const updated = [...editorInputs];
    updated[index] = { ...updated[index], [field]: value };
    setEditorInputs(updated);
  };

  const handleRemoveEditorInput = (index) => {
    setEditorInputs(editorInputs.filter((_, idx) => idx !== index));
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!editorTitle.trim() || !editorPromptTemplate.trim()) return;

    try {
      setLoading(true);
      const payload = {
        title: editorTitle,
        category: editorCategory,
        description: editorDescription,
        promptTemplate: editorPromptTemplate,
        inputs: editorInputs
      };
      const isNew = targetForm.id === 'new';
      const url = isNew ? '/api/prebuilt-forms' : `/api/prebuilt-forms/${targetForm._id || targetForm.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setMode(null);
        setTargetForm(null);
        fetchForms();
      }
    } catch (err) {
      console.error('Error saving form:', err);
    } finally {
      setLoading(false);
    }
  };

  // Runner Actions
  const handleOpenRunner = (e, form) => {
    if (e) e.stopPropagation();
    if (form.inputs && Array.isArray(form.inputs) && form.inputs.length > 0) {
      // Form has dynamic inputs -> open runner dialog
      const initialVals = {};
      form.inputs.forEach(inp => {
        initialVals[inp.name] = inp.defaultValue || '';
      });
      setRunnerInputValues(initialVals);
      setTargetForm(form);
      setMode('runner');
    } else {
      // Form has no inputs -> run directly
      executeFormPrompt(form, {});
    }
  };

  const executeFormPrompt = (form, inputVals) => {
    let finalPrompt = form.promptTemplate || form.prompt || '';
    if (form.inputs && Array.isArray(form.inputs)) {
      form.inputs.forEach(inp => {
        const val = inputVals[inp.name] !== undefined ? inputVals[inp.name] : (inp.defaultValue || '');
        const regex = new RegExp(`{{\\s*${inp.name}\\s*}}`, 'g');
        finalPrompt = finalPrompt.replace(regex, val);
      });
    }

    if (onSelectForm) {
      onSelectForm({ ...form, populatedPrompt: finalPrompt, prompt: finalPrompt });
    }
    onClose();
  };

  // Compute live prompt preview in Runner mode
  const getLivePromptPreview = () => {
    if (!targetForm) return '';
    let preview = targetForm.promptTemplate || targetForm.prompt || '';
    if (targetForm.inputs && Array.isArray(targetForm.inputs)) {
      targetForm.inputs.forEach(inp => {
        const val = runnerInputValues[inp.name] || `{{${inp.name}}}`;
        const regex = new RegExp(`{{\\s*${inp.name}\\s*}}`, 'g');
        preview = preview.replace(regex, val);
      });
    }
    return preview;
  };

  // Filtered Cards List
  const categories = ['All', 'Favorites', 'General', 'Development', 'System', 'Analytics'];
  const filteredForms = forms.filter(f => {
    const matchesSearch = 
      (f.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Favorites') return f.isFavorite === true;
    return (f.category || 'General').toLowerCase() === selectedCategory.toLowerCase();
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl font-sans flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#1c1c1c]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {mode === 'edit' 
                  ? (targetForm?.id === 'new' ? 'Create New Action Card' : 'Edit Action Card') 
                  : mode === 'runner' 
                    ? `Execute: ${targetForm?.title}` 
                    : 'Action Cards Library'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {mode === 'edit' 
                  ? 'Configure prompt templates and input parameters' 
                  : mode === 'runner' 
                    ? 'Fill parameter values to run action in chat' 
                    : 'Prebuilt automated prompts and smart workflows'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!mode && (
              <button
                onClick={handleStartCreate}
                className="px-3.5 py-1.5 rounded-xl bg-white text-black font-semibold text-xs flex items-center space-x-1.5 shadow hover:bg-slate-200 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Card</span>
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#262626] cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {mode === 'edit' ? (
            /* Card Builder / Editor Mode */
            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Card Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Open SSH Terminal"
                    value={editorTitle}
                    onChange={(e) => setEditorTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-100 focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. System, Development, Analytics"
                    value={editorCategory}
                    onChange={(e) => setEditorCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-100 focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Short explanation of what this action card does..."
                  value={editorDescription}
                  onChange={(e) => setEditorDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-100 focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1 flex items-center justify-between">
                  <span>Prompt Template / Action</span>
                  <span className="text-[10px] text-slate-500 font-mono">Use {"{{input_name}}"} for dynamic values</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Open a new terminal window and connect via SSH to host {{host}} as user {{user}}."
                  value={editorPromptTemplate}
                  onChange={(e) => setEditorPromptTemplate(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-200 focus:outline-none focus:border-white"
                />
              </div>

              {/* Dynamic Input Parameters Manager */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between border-b border-[#262626] pb-2">
                  <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dynamic Input Parameters ({editorInputs.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEditorInput}
                    className="px-2.5 py-1 rounded-lg bg-[#212121] hover:bg-[#2a2a2a] text-xs text-slate-200 font-medium border border-[#2a2a2a] flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Parameter</span>
                  </button>
                </div>

                {editorInputs.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic font-mono">No input parameters added. Card will run directly without prompting.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {editorInputs.map((inp, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#171717] border border-[#262626] grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono block mb-0.5">Variable Name</label>
                          <input
                            type="text"
                            placeholder="e.g. host"
                            value={inp.name || ''}
                            onChange={(e) => handleUpdateEditorInput(idx, 'name', e.target.value)}
                            className="w-full p-1.5 rounded-lg bg-[#0c0c0c] border border-[#2a2a2a] text-xs font-mono text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono block mb-0.5">User Label</label>
                          <input
                            type="text"
                            placeholder="e.g. Host IP"
                            value={inp.label || ''}
                            onChange={(e) => handleUpdateEditorInput(idx, 'label', e.target.value)}
                            className="w-full p-1.5 rounded-lg bg-[#0c0c0c] border border-[#2a2a2a] text-xs text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono block mb-0.5">Default Value</label>
                          <input
                            type="text"
                            placeholder="e.g. 127.0.0.1"
                            value={inp.defaultValue || ''}
                            onChange={(e) => handleUpdateEditorInput(idx, 'defaultValue', e.target.value)}
                            className="w-full p-1.5 rounded-lg bg-[#0c0c0c] border border-[#2a2a2a] text-xs text-slate-100"
                          />
                        </div>
                        <div className="flex items-center justify-end pt-3 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveEditorInput(idx)}
                            className="p-1.5 rounded-lg bg-[#212121] hover:bg-red-950/50 text-slate-400 hover:text-red-400 cursor-pointer"
                            title="Remove Parameter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => { setMode(null); setTargetForm(null); }}
                  className="px-4 py-2 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 shadow flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Card</span>
                </button>
              </div>
            </form>
          ) : mode === 'runner' ? (
            /* Interactive Form Runner Mode */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a]">
                <h4 className="text-xs font-semibold text-white">{targetForm?.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{targetForm?.description}</p>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-white">Provide Parameter Values</div>
                {targetForm?.inputs?.map((inp, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium block">
                      {inp.label || inp.name}
                    </label>
                    <input
                      type={inp.type || 'text'}
                      value={runnerInputValues[inp.name] || ''}
                      onChange={(e) => setRunnerInputValues({ ...runnerInputValues, [inp.name]: e.target.value })}
                      placeholder={`Enter ${inp.label || inp.name}...`}
                      className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-100 focus:outline-none focus:border-white font-mono"
                    />
                  </div>
                ))}
              </div>

              {/* Live Prompt Preview */}
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase font-bold text-slate-500 font-mono">Live Prompt Execution Preview</div>
                <div className="p-3 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {getLivePromptPreview()}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => { setMode(null); setTargetForm(null); }}
                  className="px-4 py-2 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => executeFormPrompt(targetForm, runnerInputValues)}
                  className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 shadow flex items-center space-x-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Execute Action in Chat</span>
                </button>
              </div>
            </div>
          ) : (
            /* Action Cards Library List View */
            <>
              {/* Category Pills & Search */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search action cards by title, description, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-xs text-slate-100 focus:outline-none focus:border-white"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium font-mono transition-all cursor-pointer whitespace-nowrap ${
                        selectedCategory === cat
                          ? 'bg-white text-black font-semibold shadow'
                          : 'bg-[#1c1c1c] text-slate-400 hover:text-white hover:bg-[#262626] border border-[#2a2a2a]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards Grid */}
              {loading ? (
                <div className="text-center py-12 text-xs text-slate-500 font-mono">
                  Loading action cards...
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400 space-y-3">
                  <p>No action cards match your criteria.</p>
                  <button
                    onClick={handleStartCreate}
                    className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 cursor-pointer"
                  >
                    Create New Action Card
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {filteredForms.map((form) => {
                    const id = form._id || form.id;
                    const inputsCount = (form.inputs && Array.isArray(form.inputs)) ? form.inputs.length : 0;

                    return (
                      <div 
                        key={id}
                        className="p-4 rounded-2xl bg-[#1c1c1c] hover:bg-[#222222] transition-all border border-[#2a2a2a] flex flex-col justify-between space-y-3 group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-slate-100 group-hover:text-white">{form.title}</span>
                              {form.category && (
                                <span className="text-[10px] bg-[#262626] text-slate-300 px-2 py-0.5 rounded font-mono">
                                  {form.category}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={(e) => handleToggleFavorite(e, id)}
                              className={`p-1 rounded transition-colors ${form.isFavorite ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`}
                              title={form.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                            {form.description || form.promptTemplate || form.prompt}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#262626]">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {inputsCount > 0 ? `${inputsCount} ${inputsCount === 1 ? 'parameter' : 'parameters'}` : 'Direct Execution'}
                          </span>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={(e) => handleStartEdit(e, form)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2c2c2c] transition-colors cursor-pointer"
                              title="Edit Card"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => handleDeleteForm(e, id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2c2c2c] transition-colors cursor-pointer"
                              title="Delete Card"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => handleOpenRunner(e, form)}
                              className="px-3 py-1.5 rounded-xl bg-white text-black hover:bg-slate-200 text-xs font-semibold flex items-center space-x-1 shadow transition-all cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-black" />
                              <span>{inputsCount > 0 ? 'Run...' : 'Run'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
