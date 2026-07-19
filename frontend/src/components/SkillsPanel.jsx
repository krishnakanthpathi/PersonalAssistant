import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Trash2, 
  Edit3, 
  Plus, 
  ArrowLeft, 
  Save, 
  Code, 
  HelpCircle,
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  Info,
  Terminal,
  Settings,
  List
} from 'lucide-react';

const SKILL_TEMPLATES = [
  {
    name: 'HTTP Get Request',
    description: 'Fetch JSON data from a public REST API endpoint.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The endpoint URL to fetch data from (e.g. "https://api.github.com/repos/nodejs/node").'
        }
      },
      required: ['url']
    },
    code: `async ({ url }, context) => {
  // Use global fetch
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Jarvis-Personal-Assistant'
    }
  });
  
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }
  
  const data = await response.json();
  return data;
}`
  },
  {
    name: 'Execute Terminal Command',
    description: 'Run arbitrary macOS shell command and return the output.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to run (e.g. "pmset -g batt").'
        }
      },
      required: ['command']
    },
    code: `async ({ command }, context) => {
  // Execute a shell command and return standard output
  const { stdout, stderr } = await context.execAsync(command);
  
  if (stderr && !stdout) {
    throw new Error(stderr);
  }
  
  return stdout.trim();
}`
  },
  {
    name: 'Create Local Text File',
    description: 'Write string content to a local file in the file system.',
    parameters: {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'The absolute filepath to write to (e.g. "/Users/username/Desktop/note.txt").'
        },
        content: {
          type: 'string',
          description: 'The text content to write into the file.'
        }
      },
      required: ['filepath', 'content']
    },
    code: `async ({ filepath, content }, context) => {
  const fs = context.fs.promises;
  const path = context.path;
  
  // Create parent directory if it does not exist
  const dir = path.dirname(filepath);
  await fs.mkdir(dir, { recursive: true });
  
  await fs.writeFile(filepath, content, 'utf8');
  return \`File successfully created and written to \${filepath}\`;
}`
  },
  {
    name: 'Say TTS Speech',
    description: 'Announce text out loud using macOS native Text-to-Speech.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The sentence / text to speak out loud.'
        },
        voice: {
          type: 'string',
          description: 'Optional voice name (e.g. "Samantha", "Daniel").'
        }
      },
      required: ['text']
    },
    code: `async ({ text, voice }, context) => {
  const voiceArg = voice ? \`-v "\${voice}"\` : '';
  const cleanText = text.replace(/"/g, '\\"');
  
  await context.execAsync(\`say \${voiceArg} "\${cleanText}"\`);
  return \`Announced speech: "\${text}"\`;
}`
  }
];

export default function SkillsPanel({ generatedFromChart = null, chatHistory = null, generateFromChatOnly = false, onClearGeneratedState = null }) {
  const [skills, setSkills] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'create', 'edit'
  const [editingSkillId, setEditingSkillId] = useState(null);
  
  // Alerts
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form States
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParameters, setFormParameters] = useState('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}');
  const [formCode, setFormCode] = useState('');

  // Testing Lab States
  const [testArgs, setTestArgs] = useState('{\n  \n}');
  const [testResult, setTestResult] = useState('');
  const [testError, setTestError] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testLatency, setTestLatency] = useState(null);

  // Parameter Visual Builder helper state
  const [paramKeys, setParamKeys] = useState([]);

  // Fetch skills
  const fetchSkills = async () => {
    setIsFetching(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/api/skills');
      const data = await response.json();
      if (data.success) {
        setSkills(data.skills);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(`Failed to fetch custom skills: ${err.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  // Watch for direct AI conversion deep-link from chart or chat history
  useEffect(() => {
    if (generatedFromChart || (generateFromChatOnly && chatHistory && chatHistory.length > 0)) {
      handleGenerateFromChart(generatedFromChart, chatHistory);
    }
  }, [generatedFromChart, generateFromChatOnly, chatHistory]);

  const handleGenerateFromChart = async (mermaidCode, history) => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('http://localhost:3000/api/skills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mermaidCode, chatHistory: history })
      });
      const data = await response.json();
      if (data.success && data.skill) {
        const { name, description, parameters, code } = data.skill;
        setFormName(name || '');
        setFormDescription(description || '');
        setFormParameters(JSON.stringify(parameters || { type: 'object', properties: {}, required: [] }, null, 2));
        setFormCode(code || '');
        setSuccess('Successfully generated custom skill matching the Mermaid flowchart! Inspect and test it below.');
        setActiveTab('create');
      } else {
        setError(data.error || 'Failed to generate skill.');
      }
    } catch (err) {
      setError(`Failed to generate skill from chart: ${err.message}`);
    } finally {
      setIsGenerating(false);
      if (onClearGeneratedState) onClearGeneratedState();
    }
  };

  const handleApplyTemplate = (template) => {
    setFormDescription(template.description);
    setFormParameters(JSON.stringify(template.parameters, null, 2));
    setFormCode(template.code);
    setSuccess(`Loaded template: ${template.name}`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    let parsedParams;
    try {
      parsedParams = JSON.parse(formParameters);
    } catch (err) {
      setError('Parameters must be a valid JSON schema object.');
      setIsSaving(false);
      return;
    }

    const payload = {
      name: formName,
      description: formDescription,
      parameters: parsedParams,
      code: formCode
    };

    try {
      const url = activeTab === 'edit' 
        ? `http://localhost:3000/api/skills/${editingSkillId}` 
        : 'http://localhost:3000/api/skills';
      
      const method = activeTab === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess(activeTab === 'edit' ? 'Skill updated successfully!' : 'Skill created successfully!');
        resetForm();
        fetchSkills();
        setActiveTab('list');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(`Failed to save skill: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this custom skill?')) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`http://localhost:3000/api/skills/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Skill deleted successfully!');
        fetchSkills();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(`Failed to delete skill: ${err.message}`);
    }
  };

  const handleEditClick = (skill) => {
    setEditingSkillId(skill._id);
    setFormName(skill.name);
    setFormDescription(skill.description);
    setFormParameters(JSON.stringify(skill.parameters, null, 2));
    setFormCode(skill.code);
    setError(null);
    setSuccess(null);
    setActiveTab('edit');
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult('');
    setTestError('');
    setTestLatency(null);

    let parsedArgs;
    try {
      parsedArgs = JSON.parse(testArgs);
    } catch (err) {
      setTestError('Test arguments must be a valid JSON object.');
      setIsTesting(false);
      return;
    }

    let parsedParams;
    try {
      parsedParams = JSON.parse(formParameters);
    } catch (err) {
      setTestError('Form parameters schema is invalid JSON.');
      setIsTesting(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/skills/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formCode,
          args: parsedArgs,
          name: formName || 'test_skill',
          parameters: parsedParams
        })
      });

      const data = await response.json();
      if (data.success) {
        setTestResult(data.result);
        setTestLatency(data.latency);
      } else {
        setTestError(data.error || 'Execution failed.');
      }
    } catch (err) {
      setTestError(`Execution failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormParameters('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}');
    setFormCode('');
    setEditingSkillId(null);
    setTestArgs('{\n  \n}');
    setTestResult('');
    setTestError('');
    setTestLatency(null);
  };

  return (
    <div className="flex flex-grow h-full overflow-hidden p-4 sm:p-6 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Code className="w-5 h-5 text-accent-blue" />
          <div>
            <h2 className="text-md font-semibold text-white font-sans">Custom Skills Manager</h2>
            <p className="text-xs text-gray-400">Add, test, and program dynamic tools into Jarvis's reasoning catalog.</p>
          </div>
        </div>
        <div>
          {activeTab === 'list' ? (
            <button
              onClick={() => { resetForm(); setActiveTab('create'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/90 border border-transparent rounded-lg text-xs font-semibold text-white transition cursor-pointer"
            >
              <Plus size={13} /> Create Skill
            </button>
          ) : (
            <button
              onClick={() => { resetForm(); setActiveTab('list'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-semibold text-gray-300 transition cursor-pointer"
            >
              <ArrowLeft size={13} /> Back to List
            </button>
          )}
        </div>
      </div>

      {/* Main Alert notifications */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2 items-center flex-shrink-0 animate-fadeIn">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald rounded-xl text-xs flex gap-2 items-center flex-shrink-0 animate-fadeIn">
          <CheckCircle size={14} className="flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* RENDER DYNAMIC COMPONENT LOADER */}
      {isGenerating ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-12 bg-white/5 border border-white/5 rounded-2xl">
          <Sparkles className="w-10 h-10 text-accent-blue animate-pulse mb-3" />
          <h3 className="text-sm font-semibold text-white">AI Flowchart Analysis</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">Jarvis is matching your Mermaid chart logic, preparing standard parameters, and crafting executable skill code...</p>
          <div className="flex gap-1.5 mt-4">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      ) : activeTab === 'list' ? (
        /* ================= LIST OF SKILLS VIEW ================= */
        <div className="flex-grow overflow-hidden flex flex-col bg-white/5 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <List className="w-4 h-4 text-accent-blue" />
            <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Dynamic Skills Catalog</span>
            <span className="ml-auto px-2 py-0.5 bg-white/5 rounded-full font-mono text-[10px] text-gray-400">
              {skills.length} Loaded
            </span>
          </div>

          <div className="flex-grow overflow-y-auto pr-1">
            {isFetching ? (
              <div className="text-center text-xs text-gray-500 py-12 flex flex-col items-center gap-2 m-auto">
                <RefreshCw size={16} className="animate-spin text-accent-blue" />
                Loading dynamic skills...
              </div>
            ) : skills.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-16 max-w-md m-auto flex flex-col items-center">
                <Info size={24} className="text-white/10 mb-2" />
                <p className="font-semibold text-gray-300">No custom skills created yet.</p>
                <p className="text-gray-500 mt-1 leading-relaxed">
                  Dynamic skills allow you to program new capabilities (like querying internal APIs or controlling system scripts) directly. Click "Create Skill" or convert a flowchart from the assistant chat to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skills.map((skill) => (
                  <div key={skill._id} className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 bg-accent-blue/10 border border-accent-blue/20 text-accent-blue rounded font-mono text-xs font-bold">
                          {skill.name}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEditClick(skill)}
                            className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition cursor-pointer"
                            title="Edit Skill"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(skill._id)}
                            className="p-1 hover:bg-red-500/10 rounded text-gray-400 hover:text-red-400 transition cursor-pointer"
                            title="Delete Skill"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 font-medium mb-3">{skill.description}</p>
                      
                      {/* Arguments Preview */}
                      {skill.parameters?.properties && Object.keys(skill.parameters.properties).length > 0 && (
                        <div className="mb-3">
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Accepts Arguments:</span>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(skill.parameters.properties).map(([name, schema]) => (
                              <span key={name} className="bg-white/5 border border-white/5 rounded px-1.5 py-0.2 text-[9px] font-mono text-gray-400" title={schema.description}>
                                {name} <span className="text-[8px] text-gray-500">({schema.type})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t border-white/5 pt-3 mt-2 flex items-center justify-between text-[10px] text-gray-500">
                      <span>Created: {new Date(skill.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
                        Active in Agent Catalog
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= CREATE & EDIT WORKSPACE ================= */
        <div className="flex-grow flex gap-4 overflow-hidden h-full min-h-0">
          
          {/* Left Frame: Form Details & Logic Builder */}
          <div className="w-3/5 bg-white/5 border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col h-full overflow-hidden">
            <form onSubmit={handleSave} className="flex-grow flex flex-col overflow-hidden justify-between">
              <div className="flex-grow overflow-y-auto space-y-4 pr-1">
                
                {/* Templates Selector */}
                {activeTab === 'create' && (
                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Quick Start Templates</span>
                    <div className="grid grid-cols-2 gap-2">
                      {SKILL_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.name}
                          type="button"
                          onClick={() => handleApplyTemplate(tmpl)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] text-left font-medium text-gray-300 transition-colors truncate cursor-pointer"
                        >
                          ⚡ {tmpl.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skill Name */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Skill Name (snake_case)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. upload_system_reports"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    className="w-full px-3 py-2 bg-black/40 border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50 transition-all font-mono"
                  />
                  <span className="text-[9px] text-gray-500 mt-0.5 block">Unique name details should correspond to variable rules.</span>
                </div>

                {/* Skill Description */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Description (instructions for LLM model)</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Uploads system hardware logs and diagnostics report to internal dashboard API."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50 transition-all"
                  />
                  <span className="text-[9px] text-gray-500 mt-0.5 block">Crucial for OKF selection and LLM decision-making. Be extremely precise.</span>
                </div>

                {/* Parameter Schema */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Parameters Schema (OpenAI JSON Schema)</label>
                  <textarea
                    required
                    rows={6}
                    value={formParameters}
                    onChange={(e) => setFormParameters(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50 transition-all font-mono whitespace-pre leading-relaxed text-[11px]"
                  />
                </div>

                {/* Executable JS Code */}
                <div className="flex flex-col flex-grow">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Executable JavaScript Code</label>
                  <div className="flex-grow min-h-[220px] relative">
                    <textarea
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder={`async (args, context) => {\n  // destructure input parameters\n  const { prop } = args;\n  // use tools: exec, execAsync, fs, path, fetch, logger\n  return "Done";\n}`}
                      className="w-full h-full min-h-[220px] px-3 py-3 bg-black/40 border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50 transition-all font-mono whitespace-pre leading-relaxed text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Form submit/save button footer */}
              <div className="border-t border-white/5 pt-4 flex gap-3 flex-shrink-0">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-grow py-2.5 bg-accent-blue hover:bg-accent-blue/90 disabled:bg-accent-blue/40 disabled:text-white/40 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                  {activeTab === 'edit' ? 'Update custom skill' : 'Save & Register Skill'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Frame: TESTING CONSOLE */}
          <div className="w-2/5 flex flex-col gap-4 overflow-hidden h-full">
            {/* Context bindings info box */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex-shrink-0 text-xs">
              <h4 className="font-semibold text-white flex items-center gap-1.5 mb-2">
                <Settings size={14} className="text-accent-blue" />
                Execution Bindings
              </h4>
              <p className="text-gray-400 leading-relaxed mb-3">
                Jarvis injects a special <code className="text-accent-mono px-1 py-0.2 rounded bg-black/40 text-[10px]">context</code> variable into your code, giving you permissioned access to:
              </p>
              <ul className="space-y-1.5 font-mono text-[10px] text-gray-300">
                <li>• <code className="text-accent-emerald font-bold">context.execAsync(cmd)</code>: Promise-based shell exec</li>
                <li>• <code className="text-accent-emerald font-bold">context.fs</code>: Node filesystem APIs</li>
                <li>• <code className="text-accent-emerald font-bold">context.path</code>: Node path utilities</li>
                <li>• <code className="text-accent-emerald font-bold">context.logger</code>: Logger client</li>
                <li>• <code className="text-accent-emerald font-bold">fetch</code>: Global http client</li>
              </ul>
            </div>

            {/* Live Testing Lab */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col flex-grow overflow-hidden">
              <h4 className="font-semibold text-white flex items-center gap-1.5 mb-3 flex-shrink-0">
                <Terminal size={14} className="text-accent-blue" />
                Live Testing Console
              </h4>
              
              <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Mock Arguments (JSON)</label>
                  <textarea
                    rows={4}
                    value={testArgs}
                    onChange={(e) => setTestArgs(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50 transition-all font-mono text-[11px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting || !formCode.trim()}
                  className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isTesting ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                  Run Live Benchmark Test
                </button>

                {/* Outputs console logs */}
                {(testResult || testError) && (
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col flex-grow min-h-[140px] overflow-hidden">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide block mb-2 flex-shrink-0">Execution Result:</span>
                    <div className="flex-grow overflow-y-auto font-mono text-[10px] select-text pr-1 leading-relaxed">
                      {testLatency && (
                        <span className="block text-accent-blue mb-1 font-semibold">[Latency: {testLatency}ms]</span>
                      )}
                      {testResult && (
                        <pre className="text-accent-emerald whitespace-pre-wrap">{testResult}</pre>
                      )}
                      {testError && (
                        <pre className="text-red-400 whitespace-pre-wrap">{testError}</pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
