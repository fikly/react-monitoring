import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, theme } from 'antd';
import {
  DashboardOutlined,
  EyeOutlined,
  BugOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Overview' },
  { key: '/page-views', icon: <EyeOutlined />, label: 'Page Views' },
  { key: '/errors', icon: <BugOutlined />, label: 'Errors' },
  { key: '/performance', icon: <ThunderboltOutlined />, label: 'Performance' },
  { key: '/api-calls', icon: <ApiOutlined />, label: 'API Calls' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Typography.Title
            level={5}
            style={{ margin: 0, color: '#5F5DFF', whiteSpace: 'nowrap' }}
          >
            {collapsed ? 'WM' : 'Web Monitor'}
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            position: 'sticky',
            top: 0,
            zIndex: 9,
          }}
        >
          {collapsed ? (
            <MenuUnfoldOutlined
              onClick={() => setCollapsed(false)}
              style={{ fontSize: 18, cursor: 'pointer' }}
            />
          ) : (
            <MenuFoldOutlined
              onClick={() => setCollapsed(true)}
              style={{ fontSize: 18, cursor: 'pointer' }}
            />
          )}
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
