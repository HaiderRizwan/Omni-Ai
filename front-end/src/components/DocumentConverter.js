import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Download, UploadCloud } from 'lucide-react';

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
    <section className="doc-converter" id="free-features">
      <motion.div
        className="doc-card"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <p className="muted">Upload a file and convert it instantly.</p>

        <div {...getRootProps({ className: `dropzone${isDragActive ? ' drag-active' : ''}` })}>
          <input {...getInputProps()} />
          <UploadCloud size={18} />
          <span>{isDragActive ? 'Drop the file here...' : 'Drag & drop or click to select'}</span>
          {file && (
            <span className="file-chip">{file.name}</span>
          )}
        </div>

        <form onSubmit={onSubmit} className="doc-form">
          <div className="field">
            <label className="label">Or choose file</label>
            <input type="file" accept=".pdf,.txt,.csv,.json,.html" onChange={(e) => setFile(e.target.files[0] || null)} />
          </div>

          <div className="field">
            <label className="label">Conversion</label>
            <select value={conversionType} onChange={(e) => setConversionType(e.target.value)} className="select">
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
          </div>

          {error && <div className="error">{error}</div>}

          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Converting...' : 'Convert & Download'}
          </button>
        </form>
      </motion.div>
    </section>
  );
}

export default DocumentConverter;


