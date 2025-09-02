import React, { useRef, useEffect, useState } from 'react';
import RichTextEditor from '../RichTextEditor/RichTextEditor';
import ExcelTableDisplay from '../ExcelTableDisplay/ExcelTableDisplay';
import './BlockRenderer.css';

const BlockRenderer = ({ block, onChange, onImageUpload, readOnly = false }) => {
  const editorRef = useRef(null);
  const [isEditingBanner, setIsEditingBanner] = useState(false);

  // Handle content changes
  const handleContentChange = (newContent) => {
    if (onChange) {
      onChange(block.id, { content: newContent });
    }
  };

  // Handle banner text change
  const handleBannerTextChange = (e) => {
    if (onChange && block.content) {
      onChange(block.id, {
        content: {
          ...block.content,
          text: e.target.value
        }
      });
    }
  };

  // Render based on block type
  switch (block.type) {
    case 'text':
      return (
        <div className="block-text-content">
          <RichTextEditor
            ref={editorRef}
            value={block.content || ''}
            onChange={handleContentChange}
            readOnly={readOnly}
            onImageUpload={onImageUpload}
            hideToolbar={false}
            className="block-editor"
          />
        </div>
      );

    case 'table':
      // Use ExcelTableDisplay for proper table rendering
      return (
        <div className="block-table-content">
          <ExcelTableDisplay
            tableHtml={block.content?.html}
            data={block.content?.data}
            rows={block.content?.rows}
            columns={block.content?.columns}
            readOnly={readOnly}
            onChange={(newData) => {
              if (onChange && block.content) {
                onChange(block.id, {
                  content: {
                    ...block.content,
                    data: newData
                  }
                });
              }
            }}
          />
        </div>
      );

    case 'image':
      return (
        <div className="block-image-content">
          {block.content?.src && (
            <>
              <img 
                src={block.content.src} 
                alt={block.content.alt || 'Image'} 
                className="block-image"
              />
              {block.content.caption && (
                <div className="image-caption">{block.content.caption}</div>
              )}
            </>
          )}
        </div>
      );

    case 'banner':
    case 'callout':
    case 'title':
      const bannerClass = block.type === 'callout' ? 'callout-banner' : 
                         block.type === 'title' ? 'title-banner' : 
                         `banner-${block.content?.color || 'blue'}`;
      
      return (
        <div className={`block-banner-content ${bannerClass}`}>
          {!readOnly && isEditingBanner ? (
            <textarea
              className="banner-text-edit"
              value={block.content?.text || ''}
              onChange={handleBannerTextChange}
              onBlur={() => setIsEditingBanner(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  setIsEditingBanner(false);
                }
              }}
              autoFocus
            />
          ) : (
            <div 
              className="banner-text"
              onClick={() => !readOnly && setIsEditingBanner(true)}
              style={{ cursor: readOnly ? 'default' : 'text' }}
            >
              {block.content?.text || 'Click to edit...'}
            </div>
          )}
          
          {block.content?.newLine && <div className="banner-line-break" />}
          
          {block.type === 'banner' && block.content?.color === 'green' && (
            <div className="banner-checkbox">
              <input 
                type="checkbox" 
                checked={block.content?.isDone || false}
                onChange={(e) => {
                  if (onChange && block.content) {
                    onChange(block.id, {
                      content: {
                        ...block.content,
                        isDone: e.target.checked
                      }
                    });
                  }
                }}
                disabled={readOnly}
              />
            </div>
          )}
        </div>
      );

    case 'divider':
      return <hr className="block-divider" />;

    case 'spacer':
      return <div className="block-spacer" style={{ height: block.content?.height || 20 }} />;

    case 'code':
      return (
        <pre className="block-code-content">
          <code className={`language-${block.content?.language || 'javascript'}`}>
            {block.content?.code || ''}
          </code>
        </pre>
      );

    case 'quote':
      return (
        <blockquote className="block-quote-content">
          {block.content?.text || ''}
          {block.content?.author && (
            <cite className="quote-author">— {block.content.author}</cite>
          )}
        </blockquote>
      );

    case 'list':
      const ListTag = block.content?.ordered ? 'ol' : 'ul';
      return (
        <ListTag className="block-list-content">
          {(block.content?.items || []).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ListTag>
      );

    case 'embed':
      return (
        <div className="block-embed-content">
          {block.content?.html ? (
            <div dangerouslySetInnerHTML={{ __html: block.content.html }} />
          ) : block.content?.url ? (
            <iframe 
              src={block.content.url}
              title="Embedded content"
              className="embed-iframe"
              frameBorder="0"
              allowFullScreen
            />
          ) : null}
        </div>
      );

    case 'file':
      return (
        <div className="block-file-content">
          <a 
            href={block.content?.url} 
            download={block.content?.name}
            className="file-link"
          >
            📎 {block.content?.name || 'Download file'}
          </a>
          {block.content?.size && (
            <span className="file-size">
              ({formatFileSize(block.content.size)})
            </span>
          )}
        </div>
      );

    default:
      return (
        <div className="block-unknown-content">
          <p>Unknown block type: {block.type}</p>
          <pre>{JSON.stringify(block.content, null, 2)}</pre>
        </div>
      );
  }
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export default BlockRenderer;