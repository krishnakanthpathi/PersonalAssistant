import React, { useState, useEffect } from 'react';
import { X, Play, Layers, Star, Plus, Edit3, Trash2, Save } from 'lucide-react';

export default function PrebuiltFormsModal({ isOpen, onClose, onSelectForm }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingForm, setEditingForm] = useState(null); // null if list, {} if creating/editing

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchForms();
      setEditingForm(null);
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

  const handleStartCreate = () => {
    setTitle('');
    setCategory('General');
    setDescription('');
    setPromptTemplate('');
    setEditingForm({ id: 'new' });
  };

  const handleStartEdit = (e, form) => {
    e.stopPropagation();
    setTitle(form.title || '');
    setCategory(form.category || 'General');
    setDescription(form.description || '');
    setPromptTemplate(form.promptTemplate || form.prompt || '');
    setEditingForm(form);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!title.trim() || !promptTemplate.trim()) return;

    try {
      setLoading(true);
      const payload = { title, category, description, promptTemplate };
      const isNew = editingForm.id === 'new';
      const url = isNew ? '/api/prebuilt-forms' : `/api/prebuilt-forms/${editingForm._id || editingForm.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setEditingForm(null);
        fetchForms();
      }
    } catch (err) {
      console.error('Error saving form:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl font-sans">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#212121] text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                {editingForm ? (editingForm.id === 'new' ? 'Create New Action Card' : 'Edit Action Card') : 'Action Cards Library'}
              </h3>
              <p className="text-xs text-slate-400">Custom prompt cards, forms & automated tasks</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!editingForm && (
              <button
                onClick={handleStartCreate}
                className="px-3 py-1.5 rounded-xl bg-white text-black font-semibold text-xs flex items-center space-x-1.5 shadow hover:bg-slate-200 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Card</span>
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#212121] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-3">
          {editingForm ? (
            /* Card Editor Form */
            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Card Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Daily Standup Summary"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-100 focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Work, Coding, Analytics"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-100 focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Short description of what this action card does..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-100 focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Prompt Template / Action</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Enter the prompt template to execute..."
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-200 focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setEditingForm(null)}
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
          ) : loading ? (
            <div className="text-center py-10 text-xs text-slate-500">
              Loading action cards...
            </div>
          ) : forms.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 space-y-3">
              <p>No action cards found in database.</p>
              <button
                onClick={handleStartCreate}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Create Your First Action Card
              </button>
            </div>
          ) : (
            forms.map((form) => {
              const id = form._id || form.id;
              return (
                <div 
                  key={id}
                  onClick={() => {
                    onSelectForm(form);
                    onClose();
                  }}
                  className="p-4 rounded-xl bg-[#1c1c1c] hover:bg-[#242424] transition-colors border border-[#2a2a2a] flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={(e) => handleToggleFavorite(e, id)}
                      className={`p-1 rounded transition-colors ${form.isFavorite ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`}
                      title={form.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-100">{form.title}</span>
                        {form.category && (
                          <span className="text-[10px] bg-[#262626] text-slate-300 px-2 py-0.5 rounded font-mono">
                            {form.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{form.description || form.promptTemplate || 'Action card'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => handleStartEdit(e, form)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2f2f2f] transition-colors cursor-pointer"
                      title="Edit Card"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteForm(e, id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2f2f2f] transition-colors cursor-pointer"
                      title="Delete Card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        onSelectForm(form);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-slate-200 text-xs font-semibold flex items-center space-x-1 shadow transition-all ml-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-black" />
                      <span>Run</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
