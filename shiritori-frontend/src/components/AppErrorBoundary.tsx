import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string | null;
}

export default class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      message: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || '알 수 없는 오류가 발생했습니다.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, message: null });
    if (typeof window !== 'undefined') {
      window.location.hash = '#/';
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#F7F7F9] px-6 text-center">
        <img src="/logo.png" alt="Shiritori" className="mb-5 h-16 w-auto object-contain" />
        <h1 className="mb-2 text-lg font-black text-gray-900">앱을 다시 불러올게요</h1>
        <p className="mb-6 text-sm font-medium text-gray-500">
          일시적인 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.
        </p>
        <button
          type="button"
          onClick={this.handleReset}
          className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white active:scale-95"
        >
          다시 시도
        </button>
        {import.meta.env.DEV && this.state.message ? (
          <pre className="mt-5 max-w-sm overflow-x-auto rounded-xl bg-white p-3 text-left text-[11px] text-red-600 shadow">
            {this.state.message}
          </pre>
        ) : null}
      </div>
    );
  }
}

