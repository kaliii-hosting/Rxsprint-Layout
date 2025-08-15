import React, { createContext, useContext, useState } from 'react';

// Model mapping: Display name -> EXACT Ollama model name
const modelMap = {
    "Vanilla": "llama3.2:3b",
    "Cortex": "llama3.1:70b-instruct-q3_K_M"
};

const models = [
    { displayName: 'Vanilla', description: 'Fast responses', icon: '⚡' },
    { displayName: 'Cortex', description: 'Quality responses', icon: '🧠' }
];

const ModelContext = createContext();

export const useModel = () => {
    const context = useContext(ModelContext);
    if (!context) {
        throw new Error('useModel must be used within a ModelProvider');
    }
    return context;
};

export const ModelProvider = ({ children }) => {
    const [selectedModel, setSelectedModel] = useState('Vanilla');

    const getActualModelName = (displayName) => {
        return modelMap[displayName] || modelMap['Vanilla'];
    };

    const value = {
        selectedModel,
        setSelectedModel,
        models,
        modelMap,
        getActualModelName
    };

    return (
        <ModelContext.Provider value={value}>
            {children}
        </ModelContext.Provider>
    );
};