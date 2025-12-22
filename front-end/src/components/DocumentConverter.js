import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Download, UploadCloud, FileText } from 'lucide-react';

function DocumentConverter() {
  const [file, setFile] = useState(null);
  const [conversionType, setConversionType] = useState('text-to-pdf');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState({ conversions: [] });
  const [apiBase, setApiBase] = useState(process.env.REACT_APP_API_URL || '');

  const getCandidateBases = () => {
    const envBase = process.env.REACT_APP_API_URL;
    if (envBase) return [envBase];
    return ['http://localhost:3001', 'http://localhost:3000'];
  };

  const detectApiBase = async () => {
    const candidates = getCandidateBases();
    for (const base of candidates) {
      try {
        const res = await fetch(`${base}/api/documents/supported`, { method: 'GET' });
        if (res.ok) {
          setApiBase(base);
          const json = await res.json();
          if (json.success) {
            setSupported(json.data);
            if (json.data.conversions && json.data.conversions.length > 0) {
              setConversionType(json.data.conversions[0]);
            }
          }
          return;
        }
      } catch (e) {
        // try next
      }
    }
  };

  useEffect(() => {
    detectApiBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      toast.success(`Selected: ${acceptedFiles[0].name}`);
    }
    if (fileRejections && fileRejections.length > 0) {
      const reason = fileRejections[0]?.errors?.[0]?.message || 'File rejected';
      toast.error(reason);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/csv': ['.csv'],
      'application/json': ['.json'],
      'text/html': ['.html']
    },
    onDrop
  });

  const tryConvertOnBases = async (formData) => {
    const candidates = apiBase ? [apiBase] : getCandidateBases();
    let lastErr;
    for (const base of candidates) {
      try {
        const res = await fetch(`${base}/api/documents/convert`, {
          method: 'POST',
          body: formData
        });
        return { res, base };
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    if (lastErr) throw lastErr;
    throw new Error('No API base reachable');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Please select a file to upload.');
      toast.error('Please select a file to upload.');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversionType', conversionType);

    try {
      const promise = (async () => {
        const { res, base } = await tryConvertOnBases(formData);
        if (!apiBase && base) setApiBase(base);

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('Unexpected response from server');
        }
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.message || 'Conversion failed');
        }

        // Handle different payloads
        const data = json.data;
        if (data && data.encoding === 'base64' && data.mimeType) {
          const byteCharacters = atob(data.content);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: data.mimeType });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = data.filename || 'converted';
          document.body.appendChild(link);
          link.click();
          link.remove();
          return data.filename || 'converted.pdf';
        }

        if (typeof data === 'string') {
          const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = json.filename || 'converted.txt';
          document.body.appendChild(link);
          link.click();
          link.remove();
          return json.filename || 'converted.txt';
        }

        if (data && data.headers && data.data) {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'converted.json';
          document.body.appendChild(link);
          link.click();
          link.remove();
          return 'converted.json';
        }

        if (data && data.filename && typeof data.content === 'string') {
          const mime = data.mimeType || 'text/csv;charset=utf-8';
          const blob = new Blob([data.content], { type: mime });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = data.filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          return data.filename;
        }

        if (data && typeof data.content === 'string' && !data.filename) {
          const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'converted.txt';
          document.body.appendChild(link);
          link.click();
          link.remove();
          return 'converted.txt';
        }

        throw new Error('Unknown conversion response format');
      })();

      await toast.promise(promise, {
        loading: 'Converting... ⏳',
        success: (name) => `Downloaded ${name}`,
        error: (err) => err.message || 'Conversion failed'
      });
    } catch (err) {
      setError(err.message || 'Conversion failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative z-10 py-24 bg-noir-800/50" id="free-features">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-heading font-bold text-white mb-4">Instant Conversion</h2>
          <p className="text-white/50">Transform your documents with our high-speed processing engine.</p>
        </motion.div>

        <motion.div
          className="ui-card p-8 bg-[#0C0C0C] ring-1 ring-white/5"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div
            {...getRootProps({
              className: `border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${isDragActive
                ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`
            })}
          >
            <input {...getInputProps()} />
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-white/5 text-[var(--primary)]">
                <UploadCloud size={32} />
              </div>
            </div>
            <p className="text-lg font-medium text-white mb-2">
              {isDragActive ? 'Drop file to upload' : 'Drag & drop file here'}
            </p>
            <p className="text-sm text-white/40">Supported formats: PDF, TXT, CSV, JSON, HTML</p>

            {file && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
              >
                <FileText size={16} />
                <span className="font-mono text-sm">{file.name}</span>
              </motion.div>
            )}
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Or choose file</label>
                <input
                  type="file"
                  accept=".pdf,.txt,.csv,.json,.html"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  className="block w-full text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)] file:text-black hover:file:bg-[var(--primary-700)] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Conversion Type</label>
                <div className="relative">
                  <select
                    value={conversionType}
                    onChange={(e) => setConversionType(e.target.value)}
                    className="ui-input appearance-none cursor-pointer"
                  >
                    {(supported.conversions || []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    {supported.conversions && supported.conversions.length === 0 && (
                      <>
                        <option value="text-to-pdf">text-to-pdf</option>
                        <option value="csv-to-json">csv-to-json</option>
                        <option value="json-to-csv">json-to-csv</option>
                        <option value="html-to-pdf">html-to-pdf</option>
                        <option value="pdf-to-text">pdf-to-text</option>
                        <option value="text-to-html">text-to-html</option>
                      </>
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
                    <Download size={16} className="rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="p-3 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-sm border border-[var(--primary)]/20">{error}</div>}

            <button
              className="w-full ui-btn-primary py-3 text-lg shadow-[0_0_20px_rgba(204,255,0,0.1)]"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Processing...
                </span>
              ) : 'Convert & Download'}
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}

export default DocumentConverter;


