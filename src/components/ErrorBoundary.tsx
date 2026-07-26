'use client';
import React from 'react';

/** Keeps one bad period row (or a corrupt JSON blob) from 500-ing the whole
 *  property workspace — surfaces the error inline with a way back. */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('Workspace error:', error); }
  render() {
    if (this.state.error) {
      return (
        <div className="banner" style={{ borderColor: 'rgba(244,113,116,.4)' }}>
          <span>⚠️</span>
          <div>
            <b>Something went wrong rendering this view.</b> {this.state.error.message}{' '}
            <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => this.setState({ error: null })}>
              Dismiss
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}