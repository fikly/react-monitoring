import { useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Select, Switch, message, Tag, Space, Popconfirm, Alert, Card } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/api/client';

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const mustChangePassword = profile?.must_change_password ?? false;
  const isSuperadmin = profile?.is_superadmin ?? false;

  // Determine highest role across all orgs
  const roles = (profile?.orgs ?? []).map(o => o.role);
  const isOwner = isSuperadmin || roles.includes('owner');
  const isAdmin = isOwner || roles.includes('admin');

  // Build tabs based on role:
  // - member: Change Password
  // - admin: Change Password, Apps
  // - owner: Change Password, Apps, Members
  // - superadmin: Change Password, Organizations, Apps, Members
  const tabs = [
    { key: 'password', label: 'Change Password', children: <PasswordTab /> },
  ];
  if (isSuperadmin) {
    tabs.push({ key: 'orgs', label: 'Organizations', children: <OrgsTab /> });
  }
  if (isAdmin) {
    tabs.push({ key: 'apps', label: 'Apps', children: <AppsTab /> });
  }
  if (isOwner) {
    tabs.push({ key: 'members', label: 'Members', children: <MembersTab /> });
  }

  return (
    <div>
      <h2>Settings</h2>
      {mustChangePassword && (
        <Alert
          message="Password Change Required"
          description="You must change your password before accessing other pages."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Tabs
        defaultActiveKey={mustChangePassword ? 'password' : tabs[tabs.length - 1].key}
        items={tabs}
      />
    </div>
  );

  function PasswordTab() {
    const [form] = Form.useForm();

    const changePassword = useMutation({
      mutationFn: (values: { password: string }) =>
        api.put('/auth/me', { password: values.password }),
      onSuccess: () => {
        message.success('Password updated successfully');
        form.resetFields();
        refreshProfile();
      },
      onError: (err: any) => {
        message.error(err.response?.data?.error || 'Failed to update password');
      },
    });

    return (
      <Card style={{ maxWidth: 480 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => changePassword.mutate(v)}
        >
          <Form.Item
            name="password"
            label="New Password"
            rules={[
              { required: true },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password placeholder="Enter new password" prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm new password" prefix={<LockOutlined />} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={changePassword.isPending}>
            Update Password
          </Button>
        </Form>
      </Card>
    );
  }

  function OrgsTab() {
    const [createOpen, setCreateOpen] = useState(false);
    const [editOrg, setEditOrg] = useState<{ id: string; name: string; slug: string } | null>(null);
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

    const { data: orgsData, isLoading } = useQuery({
      queryKey: ['settings-orgs'],
      queryFn: () => api.get('/d/members').then(r => r.data),
    });

    const createOrg = useMutation({
      mutationFn: (values: { name: string; slug: string }) =>
        api.post('/d/members', values),
      onSuccess: () => {
        message.success('Organization created');
        setCreateOpen(false);
        createForm.resetFields();
        queryClient.invalidateQueries({ queryKey: ['settings-orgs'] });
        refreshProfile();
      },
      onError: (err: any) => {
        message.error(err.response?.data?.error || 'Failed to create organization');
      },
    });

    const updateOrg = useMutation({
      mutationFn: (values: { name: string; slug: string }) =>
        api.put('/d/members', values, { params: { org_id: editOrg?.id } }),
      onSuccess: () => {
        message.success('Organization updated');
        setEditOrg(null);
        editForm.resetFields();
        queryClient.invalidateQueries({ queryKey: ['settings-orgs'] });
        refreshProfile();
      },
      onError: (err: any) => {
        message.error(err.response?.data?.error || 'Failed to update organization');
      },
    });

    const deleteOrg = useMutation({
      mutationFn: (orgId: string) =>
        api.delete('/d/members', { params: { org_id: orgId } }),
      onSuccess: () => {
        message.success('Organization deleted');
        queryClient.invalidateQueries({ queryKey: ['settings-orgs'] });
        refreshProfile();
      },
      onError: (err: any) => {
        message.error(err.response?.data?.error || 'Failed to delete organization');
      },
    });

    const columns = [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Slug', dataIndex: 'slug', key: 'slug', render: (slug: string) => <code>{slug}</code> },
      { title: 'Members', dataIndex: 'member_count', key: 'member_count' },
      {
        title: 'Role', dataIndex: 'role', key: 'role',
        render: (role: string) => {
          const colors: Record<string, string> = { owner: 'gold', admin: 'blue', member: 'default', superadmin: 'purple' };
          return <Tag color={colors[role] ?? 'default'}>{role}</Tag>;
        },
      },
      {
        title: 'Actions', key: 'actions',
        render: (_: unknown, record: { id: string; role: string; name: string; slug: string }) => {
          const canEdit = ['owner', 'admin', 'superadmin'].includes(record.role);
          const canDelete = ['owner', 'superadmin'].includes(record.role);
          return (
            <Space>
              {canEdit && (
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditOrg({ id: record.id, name: record.name, slug: record.slug });
                    editForm.setFieldsValue({ name: record.name, slug: record.slug });
                  }}
                />
              )}
              {canDelete && (
                <Popconfirm title="Delete this organization?" onConfirm={() => deleteOrg.mutate(record.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </Space>
          );
        },
      },
    ];

    return (
      <>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Create Organization
          </Button>
        </div>
        <Table
          dataSource={orgsData?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />

        <Modal
          title="Create Organization"
          open={createOpen}
          onCancel={() => setCreateOpen(false)}
          onOk={() => createForm.submit()}
          confirmLoading={createOrg.isPending}
        >
          <Form form={createForm} layout="vertical" onFinish={(v) => createOrg.mutate(v)}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="My Organization" />
            </Form.Item>
            <Form.Item name="slug" label="Slug" rules={[{ required: true }]}
              extra="Lowercase letters, numbers, and hyphens only">
              <Input placeholder="my-org" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Edit Organization"
          open={!!editOrg}
          onCancel={() => { setEditOrg(null); editForm.resetFields(); }}
          onOk={() => editForm.submit()}
          confirmLoading={updateOrg.isPending}
        >
          <Form form={editForm} layout="vertical" onFinish={(v) => updateOrg.mutate(v)}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="slug" label="Slug" rules={[{ required: true }]}
              extra="Lowercase letters, numbers, and hyphens only">
              <Input />
            </Form.Item>
          </Form>
        </Modal>
      </>
    );
  }

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

    const toggleActive = useMutation({
      mutationFn: ({ appId, is_active }: { appId: string; is_active: boolean }) =>
        api.put('/d/apps', { is_active }, { params: { app_id: appId } }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['settings-apps'] });
        refreshProfile();
      },
      onError: (err: any) => {
        message.error(err.response?.data?.error || 'Failed to update app');
      },
    });

    // Build org name lookup from profile
    const orgNames: Record<string, string> = {};
    for (const o of profile?.orgs ?? []) {
      orgNames[o.id] = o.name;
    }

    const columns = [
      { title: 'App ID', dataIndex: 'app_id', key: 'app_id' },
      { title: 'Name', dataIndex: 'name', key: 'name' },
      {
        title: 'Organization', dataIndex: 'org_id', key: 'org_id',
        render: (orgId: string) => orgNames[orgId] || orgId,
      },
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
        render: (active: boolean, record: { app_id: string }) => (
          <Switch
            checked={active}
            checkedChildren="Active"
            unCheckedChildren="Inactive"
            loading={toggleActive.isPending && toggleActive.variables?.appId === record.app_id}
            onChange={(checked) => toggleActive.mutate({ appId: record.app_id, is_active: checked })}
          />
        ),
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
    const [inviteOpen, setInviteOpen] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState<string>(profile?.orgs?.[0]?.id ?? '');
    const [inviteForm] = Form.useForm();

    const { data: membersData, isLoading } = useQuery({
      queryKey: ['settings-members', selectedOrgId],
      queryFn: () => api.get('/d/members', { params: { org_id: selectedOrgId } }).then(r => r.data),
      enabled: !!selectedOrgId,
    });

    const inviteMember = useMutation({
      mutationFn: (values: { email: string; role: string; password: string }) =>
        api.post('/d/members', values, { params: { org_id: selectedOrgId } }),
      onSuccess: () => {
        message.success('Member invited');
        setInviteOpen(false);
        inviteForm.resetFields();
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
        render: (_: unknown, record: { id: string; role: string; user_id: string; email: string }) => {
          if (record.user_id === profile?.id) return null;
          return (
            <Space>
              <Popconfirm title="Remove this member?" onConfirm={() => removeMember.mutate(record.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setInviteOpen(true)}>
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
          open={inviteOpen}
          onCancel={() => setInviteOpen(false)}
          onOk={() => inviteForm.submit()}
          confirmLoading={inviteMember.isPending}
        >
          <Form form={inviteForm} layout="vertical" onFinish={(v) => inviteMember.mutate(v)}
            initialValues={{ role: 'member' }}>
            <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
              <Input placeholder="user@example.com" />
            </Form.Item>
            <Form.Item name="password" label="Initial Password" rules={[
              { required: true },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
              extra="The user will be asked to change this on first login">
              <Input.Password placeholder="Set initial password" />
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
