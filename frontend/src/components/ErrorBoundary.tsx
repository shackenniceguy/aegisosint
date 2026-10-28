import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AegisOSINT UI Runtime Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-6 text-white font-sans">
          <div className="bg-cyber-card border border-rose-500/30 rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-white">Восстановление сессии AegisOSINT</h2>
            <p className="text-xs text-cyber-textMuted font-mono break-words">
              {this.state.error?.message || 'Непредвиденная ошибка времени выполнения.'}
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-6 py-2.5 rounded-xl bg-cyber-accent text-black font-bold text-xs uppercase tracking-wider hover:bg-cyber-accent/90 transition-all inline-flex items-center gap-2 shadow-lg shadow-cyber-accent/20"
              >
                <RefreshCw className="w-4 h-4" />
                Сбросить и перезагрузить
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
