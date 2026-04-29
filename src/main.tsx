import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { XProvider } from '@ant-design/x';
import zhCN_X from '@ant-design/x/locale/zh_CN';
import App from '@/App';
import 'antd/dist/reset.css';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <XProvider
        locale={{ ...zhCN_X, ...zhCN }}
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#8B5CF6',
          },
        }}
      >
        <App />
      </XProvider>
    </BrowserRouter>
  </StrictMode>,
);
