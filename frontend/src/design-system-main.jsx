import React from 'react';
import ReactDOM from 'react-dom/client';
import { FoundationSpecimen } from './components/ui/FoundationSpecimen';
import { tokens } from './theme/tokens';

const shellStyle = {
  minHeight: '100vh',
  padding: tokens.space.xl,
  background: tokens.color.surface.cream,
  color: tokens.color.text.primary,
};

const contentStyle = {
  width: 'min(100%, 760px)',
  margin: '0 auto',
  padding: tokens.space.xl,
  background: tokens.color.surface.card,
  border: `1px solid ${tokens.color.border.default}`,
  borderRadius: tokens.radius.lg,
  boxShadow: tokens.shadow.card,
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <main style={shellStyle}>
      <div style={contentStyle}>
        <FoundationSpecimen />
      </div>
    </main>
  </React.StrictMode>,
);
