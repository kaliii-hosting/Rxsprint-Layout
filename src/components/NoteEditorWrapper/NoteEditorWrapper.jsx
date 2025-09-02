import React, { useState, useEffect, useRef } from 'react';
import RichTextEditor from '../RichTextEditor/RichTextEditor';
import UnifiedNoteEditor from '../UnifiedNoteEditor/UnifiedNoteEditor';
import { saveNoteWithBlocks, loadNoteWithBlocks, autoSaveBlocks, exportNoteData } from '../../utils/firebaseBlockSync';
import './NoteEditorWrapper.css';

// Wrapper component that provides backward compatibility
const NoteEditorWrapper = ({ 
  value,
  onChange,
  readOnly = false,
  onImageUpload,
  banners = [],
  onBannersChange,
  noteId,
  useBlockSystem = true, // Feature flag for gradual rollout
  ...otherProps
}) => {
  const [isBlockMode, setIsBlockMode] = useState(useBlockSystem);
  const [blocks, setBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const editorRef = useRef(null);

  // Load note data if noteId is provided
  useEffect(() => {
    if (noteId && isBlockMode) {
      loadNoteData();
    }
  }, [noteId, isBlockMode]);

  const loadNoteData = async () => {
    setIsLoading(true);
    const result = await loadNoteWithBlocks(noteId);
    if (result.success) {
      if (result.data.blocks) {
        setBlocks(result.data.blocks);
      }
      if (result.converted) {
        console.log('Note converted to block format');
      }
    }
    setIsLoading(false);
  };

  // Handle content changes
  const handleContentChange = (newContent) => {
    if (onChange) {
      onChange(newContent);
    }
    
    // Auto-save if in block mode and noteId exists
    if (isBlockMode && noteId && blocks.length > 0) {
      autoSaveBlocks(noteId, blocks);
    }
  };

  // Toggle between modes (for testing/migration)
  const toggleMode = () => {
    setIsBlockMode(!isBlockMode);
  };

  // Export blocks to HTML
  const exportToHtml = () => {
    if (blocks.length > 0) {
      return exportNoteData(blocks);
    }
    return value || '';
  };

  if (isLoading) {
    return <div className="editor-loading">Loading editor...</div>;
  }

  // Use block system for new notes or when enabled
  if (isBlockMode) {
    return (
      <div className="note-editor-wrapper block-mode">
        {/* Optional mode toggle for testing */}
        {process.env.NODE_ENV === 'development' && (
          <button 
            className="mode-toggle-btn"
            onClick={toggleMode}
            title="Switch to classic editor"
          >
            Switch to Classic Editor
          </button>
        )}
        
        <UnifiedNoteEditor
          ref={editorRef}
          content={value}
          onChange={handleContentChange}
          onImageUpload={onImageUpload}
          readOnly={readOnly}
          banners={banners}
          onBannersChange={onBannersChange}
          {...otherProps}
        />
      </div>
    );
  }

  // Fallback to classic editor
  return (
    <div className="note-editor-wrapper classic-mode">
      {/* Optional mode toggle for testing */}
      {process.env.NODE_ENV === 'development' && (
        <button 
          className="mode-toggle-btn"
          onClick={toggleMode}
          title="Switch to block editor"
        >
          Try New Block Editor
        </button>
      )}
      
      <RichTextEditor
        ref={editorRef}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        onImageUpload={onImageUpload}
        {...otherProps}
      />
    </div>
  );
};

export default NoteEditorWrapper;