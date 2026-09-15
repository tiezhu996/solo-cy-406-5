import { Layout, Menu, Typography } from '@arco-design/web-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ClauseList } from '../pages/ClauseList';
import { InstanceEditor } from '../pages/InstanceEditor';
import { TemplateEditor } from '../pages/TemplateEditor';
import { TemplateList } from '../pages/TemplateList';
import { VersionCompare } from '../pages/VersionCompare';

const menuItems = [
  { key: '/templates', label: '模板库' },
  { key: '/clauses', label: '条款库' }
];

export function AppRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeKey = location.pathname.startsWith('/clauses') ? '/clauses' : '/templates';

  return (
    <Layout className="app-shell">
      <Layout.Sider className="app-sider" width={232}>
        <div className="brand-block">
          <Typography.Title heading={4}>Contract Desk</Typography.Title>
          <Typography.Text>合同模板在线编辑器</Typography.Text>
        </div>
        <Menu selectedKeys={[activeKey]} onClickMenuItem={(key) => navigate(key)}>
          {menuItems.map((item) => (
            <Menu.Item key={item.key}>{item.label}</Menu.Item>
          ))}
        </Menu>
      </Layout.Sider>
      <Layout className="app-main">
        <Layout.Header className="app-header">
          <Typography.Text type="secondary">本地 IndexedDB 持久化 · 无需后端</Typography.Text>
        </Layout.Header>
        <Layout.Content className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/templates" replace />} />
            <Route path="/templates" element={<TemplateList />} />
            <Route path="/templates/:id/edit" element={<TemplateEditor />} />
            <Route path="/instances/:id" element={<InstanceEditor />} />
            <Route path="/instances/:id/versions" element={<VersionCompare />} />
            <Route path="/clauses" element={<ClauseList />} />
            <Route path="*" element={<Navigate to="/templates" replace />} />
          </Routes>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
