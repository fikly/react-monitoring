import { useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Select, message, Card, Tag, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/api/client';

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return (
    <div>
      <h2>Settings</h2>
      <Tabs
        items={[
          { key: 'apps', label: 'Apps', children: <AppsTab /> },
          { key: 'members', label: 'Members', children: <MembersTab /> },
        ]}
      />
    </div>
  );

  function AppsTab() {
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const { data: appsData, isLoading } = useQuery({
      queryKey: ['settings-apps'],
      queryFn: () => api.get('/d/apps').then(r => r.data),
    });

    const createApp = useMutation({
      mutationFn: (values: { app_id: string; name: string; org_id: string }) =>
        api.post('/d/apps', values),
      onSuccess: () => {
        message.success('App created');
        setOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['settings-apps'] });
        refreshProfile();
      },
      onError: (err: any) => {
        message.error(err.response?.data?.error || 'Failed to create app');
      },
    });

    const columns = [
      { title: 'App ID', dataIndex: 'app_id', key: 'app_id' },
      { title: 'Name', dataIndex: 'name', key: 'name' },
      {
        title: 'API Key', dataIndex: 'api_key', key: 'api_key',
        render: (key: string) => (
          <Space>
            <code>{key.slice(0, 12)}...</code>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => { navigator.clipboard.writeText(key); message.success('Copied'); }}
            />
          </Space>
        ),
      },
      {
        title: 'Status', dataIndex: 'is_active', key: 'is_active',
        render: (active: boolean) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>,
      },
    ];

    return (
      <>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Create App
          </Button>
        </div>
        <Table
          dataSource={appsData?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />
        <Modal
          title="Create App"
          open={open}
          onCancel={() => setOpen(false)}
          onOk={() => form.submit()}
          confirmLoading={createApp.isPending}
        >
          <Form form={form} layout="vertical" onFinish={(v) => createApp.mutate(v)}>
            <Form.Item name="org_id" label="Organization" rules={[{ required: true }]}>
              <Select
                options={(profile?.orgs ?? []).map(o => ({ label: o.name, value: o.id }))}
                placeholder="Select organization"
              />
            </Form.Item>
            <Form.Item name="app_id" label="App ID" rules={[{ required: true }]}
              extra="URL-friendly identifier (e.g., my-app-dev)">
              <Input placeholder="my-app-dev" />
            </Form.Item>
            <Form.Item name="name" label="App Name" rules={[{ required: true }]}>
              <Input placeholder="My App (Development)" />
            </Form.Item>
          </Form>
        </Modal>
      </>
    );
  }

  function MembersTab() {
    const [open, setOpen] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState<string>(profile?.orgs?.[0]?.id ?? '');
    const [form] = Form.useForm();

    const { data: membersData, isLoading } = useQuery({
      queryKey: ['settings-members', selectedOrgId],
      queryFn: () => api.get('/d/members', { params: { org_id: selectedOrgId } }).then(r => r.data),
      enabled: !!selectedOrgId,
    });

    const inviteMember = useMutation({
      mutationFn: (values: { email: string; role: string }) =>
        api.post('/d/members', values, { params: { org_id: selectedOrgId } }),
      onSuccess: () => {
        message.success('Member invited');
        setOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['settings-members', selectedOrgId] });
      },
      onError: (err: any) => {
        message.error(err.response?.data?.error || 'Failed to invite member');
      },
    });

    const removeMember = useMutation({
      mutationFn: (memberId: string) =>
        api.delete('/d/members', { params: { org_id: selectedOrgId, member_id: memberId } }),
      onSuccess: () => {
        message.success('Member removed');
        queryClient.invalidateQueries({ queryKey: ['settings-members', selectedOrgId] });
      },
      onError: (err: any) => {
        message.error(err.response?.data?.error || 'Failed to remove member');
      },
    });

    const columns = [
      { title: 'Email', dataIndex: 'email', key: 'email' },
      { title: 'Name', dataIndex: 'display_name', key: 'display_name' },
      {
        title: 'Role', dataIndex: 'role', key: 'role',
        render: (role: string) => {
          const colors: Record<string, string> = { owner: 'gold', admin: 'blue', member: 'default' };
          return <Tag color={colors[role] ?? 'default'}>{role}</Tag>;
        },
      },
      {
        title: 'Actions', key: 'actions',
        render: (_: unknown, record: { id: string; role: string; user_id: string }) => {
          if (record.user_id === profile?.id) return null;
          return (
            <Popconfirm title="Remove this member?" onConfirm={() => removeMember.mutate(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          );
        },
      },
    ];

    return (
      <>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Select
            value={selectedOrgId}
            onChange={setSelectedOrgId}
            style={{ width: 240 }}
            options={(profile?.orgs ?? []).map(o => ({ label: o.name, value: o.id }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Invite Member
          </Button>
        </div>
        <Table
          dataSource={membersData?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />
        <Modal
          title="Invite Member"
          open={open}
          onCancel={() => setOpen(false)}
          onOk={() => form.submit()}
          confirmLoading={inviteMember.isPending}
        >
          <Form form={form} layout="vertical" onFinish={(v) => inviteMember.mutate(v)}
            initialValues={{ role: 'member' }}>
            <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
              <Input placeholder="user@example.com" />
            </Form.Item>
            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select options={[
                { label: 'Member', value: 'member' },
                { label: 'Admin', value: 'admin' },
                { label: 'Owner', value: 'owner' },
              ]} />
            </Form.Item>
          </Form>
        </Modal>
      </>
    );
  }
}
