import React from 'react';
import { RevoGrid } from '@revolist/react-datagrid';

const TestRevoGrid = () => {
  console.log('TestRevoGrid component loaded');
  
  // Simple test data
  const columns = [
    { prop: 'name', name: 'Name' },
    { prop: 'age', name: 'Age' }
  ];
  
  const source = [
    { name: 'John', age: 30 },
    { name: 'Jane', age: 25 },
    { name: 'Bob', age: 35 }
  ];
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      width: '300px', 
      height: '200px',
      background: 'white',
      border: '2px solid blue',
      zIndex: 100000
    }}>
      <div>Test RevoGrid:</div>
      <RevoGrid
        source={source}
        columns={columns}
      />
    </div>
  );
};

export default TestRevoGrid;