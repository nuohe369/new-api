/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Card,
  Empty,
  SideSheet,
  Space,
  Table,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import {
  API,
  renderQuota,
  showError,
  timestamp2string,
} from '../../../../helpers';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';

const { Text } = Typography;

async function getAdminInviteData(userId, suffix, params = {}) {
  const paths = [`/api/user/${userId}/invite/${suffix}`, `/api/user/invite/${userId}/${suffix}`];
  let lastError;

  for (const path of paths) {
    try {
      return await API.get(path, {
        params,
        skipErrorHandler: true,
      });
    } catch (error) {
      const status = error?.response?.status;
      if (status !== 404) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError;
}

function renderInviteUserName(record) {
  if (record.display_name) {
    return record.display_name;
  }
  if (record.username) {
    return record.username;
  }
  if (record.email) {
    return record.email;
  }
  return `UID-${record.id}`;
}

const UserInviteRebateModal = ({ visible, onCancel, user, t }) => {
  const isMobile = useIsMobile();
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [inviteUsers, setInviteUsers] = useState([]);
  const [inviteUsersLoading, setInviteUsersLoading] = useState(false);
  const [inviteUsersPage, setInviteUsersPage] = useState(1);
  const [inviteUsersPageSize, setInviteUsersPageSize] = useState(10);
  const [inviteUsersTotal, setInviteUsersTotal] = useState(0);
  const [rebates, setRebates] = useState([]);
  const [rebatesLoading, setRebatesLoading] = useState(false);
  const [rebatesPage, setRebatesPage] = useState(1);
  const [rebatesPageSize, setRebatesPageSize] = useState(10);
  const [rebatesTotal, setRebatesTotal] = useState(0);

  const loadSummary = async () => {
    if (!user?.id) return;
    setSummaryLoading(true);
    try {
      const res = await getAdminInviteData(user.id, 'summary');
      const { success, message, data } = res.data;
      if (success) {
        setSummary(data);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('加载邀请返现汇总失败'));
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadInviteUsers = async (
    page = inviteUsersPage,
    pageSize = inviteUsersPageSize,
  ) => {
    if (!user?.id) return;
    setInviteUsersLoading(true);
    try {
      const res = await getAdminInviteData(user.id, 'users', {
        p: page,
        page_size: pageSize,
      });
      const { success, message, data } = res.data;
      if (success) {
        setInviteUsers(data.items || []);
        setInviteUsersTotal(data.total || 0);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('加载邀请用户失败'));
    } finally {
      setInviteUsersLoading(false);
    }
  };

  const loadRebates = async (page = rebatesPage, pageSize = rebatesPageSize) => {
    if (!user?.id) return;
    setRebatesLoading(true);
    try {
      const res = await getAdminInviteData(user.id, 'rebates', {
        p: page,
        page_size: pageSize,
      });
      const { success, message, data } = res.data;
      if (success) {
        setRebates(data.items || []);
        setRebatesTotal(data.total || 0);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('加载返现记录失败'));
    } finally {
      setRebatesLoading(false);
    }
  };

  useEffect(() => {
    if (!visible || !user?.id) return;
    setSummary(null);
    setInviteUsers([]);
    setInviteUsersTotal(0);
    setRebates([]);
    setRebatesTotal(0);
    loadSummary();
    if (inviteUsersPage !== 1) {
      setInviteUsersPage(1);
    } else {
      loadInviteUsers(1, inviteUsersPageSize);
    }
    if (rebatesPage !== 1) {
      setRebatesPage(1);
    } else {
      loadRebates(1, rebatesPageSize);
    }
  }, [visible, user?.id]);

  useEffect(() => {
    if (!visible || !user?.id) return;
    loadInviteUsers(inviteUsersPage, inviteUsersPageSize);
  }, [inviteUsersPage, inviteUsersPageSize]);

  useEffect(() => {
    if (!visible || !user?.id) return;
    loadRebates(rebatesPage, rebatesPageSize);
  }, [rebatesPage, rebatesPageSize]);

  const inviteUsersColumns = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 80,
      },
      {
        title: t('用户'),
        key: 'user',
        render: (_, record) => renderInviteUserName(record),
      },
      {
        title: t('充值状态'),
        dataIndex: 'has_topup',
        key: 'has_topup',
        render: (value) =>
          value ? (
            <Tag color='green'>{t('已充值')}</Tag>
          ) : (
            <Tag color='grey'>{t('未充值')}</Tag>
          ),
      },
      {
        title: t('充值次数'),
        dataIndex: 'topup_count',
        key: 'topup_count',
      },
      {
        title: t('累计返现'),
        dataIndex: 'total_rebate_quota',
        key: 'total_rebate_quota',
        render: (value) => renderQuota(Number(value || 0)),
      },
      {
        title: t('最近充值时间'),
        dataIndex: 'last_topup_time',
        key: 'last_topup_time',
        render: (value) => (value ? timestamp2string(value) : '-'),
      },
    ],
    [t],
  );

  const rebateColumns = useMemo(
    () => [
      {
        title: t('时间'),
        dataIndex: 'created_at',
        key: 'created_at',
        render: (value) => timestamp2string(value),
      },
      {
        title: t('下级用户'),
        dataIndex: 'invitee_display',
        key: 'invitee_display',
        render: (value, record) => value || renderInviteUserName(record),
      },
      {
        title: t('订单号'),
        dataIndex: 'trade_no',
        key: 'trade_no',
        render: (value) => <Text copyable>{value}</Text>,
      },
      {
        title: t('到账额度'),
        dataIndex: 'credited_quota',
        key: 'credited_quota',
        render: (value) => renderQuota(Number(value || 0)),
      },
      {
        title: t('返现比例'),
        dataIndex: 'rebate_rate_bp',
        key: 'rebate_rate_bp',
        render: (value) => `${Number(value || 0) / 100}%`,
      },
      {
        title: t('返现金额'),
        dataIndex: 'rebate_quota',
        key: 'rebate_quota',
        render: (value) => renderQuota(Number(value || 0)),
      },
    ],
    [t],
  );

  return (
    <SideSheet
      visible={visible}
      placement='right'
      width={isMobile ? '100%' : 1100}
      bodyStyle={{ padding: 16 }}
      onCancel={onCancel}
      title={
        <Space>
          <Tag color='blue' shape='circle'>
            {t('邀请返现')}
          </Tag>
          <Typography.Title heading={4} className='m-0'>
            {t('用户邀请返现')}
          </Typography.Title>
          <Text type='tertiary'>
            {user?.username || '-'} (ID: {user?.id || '-'})
          </Text>
        </Space>
      }
    >
      <div className='space-y-4'>
        <Card loading={summaryLoading} className='!rounded-xl'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div>
              <div className='text-xs text-gray-500 mb-1'>{t('邀请码')}</div>
              <div className='font-medium'>{summary?.aff_code || '-'}</div>
            </div>
            <div>
              <div className='text-xs text-gray-500 mb-1'>{t('邀请人数')}</div>
              <div className='font-medium'>{summary?.aff_count || 0}</div>
            </div>
            <div>
              <div className='text-xs text-gray-500 mb-1'>{t('待划转收益')}</div>
              <div className='font-medium'>
                {renderQuota(summary?.aff_quota || 0)}
              </div>
            </div>
            <div>
              <div className='text-xs text-gray-500 mb-1'>{t('累计收益')}</div>
              <div className='font-medium'>
                {renderQuota(summary?.aff_history_quota || 0)}
              </div>
            </div>
          </div>
          <div className='mt-3 flex items-center gap-2 text-xs text-gray-500'>
            <Badge dot type='success' />
            {t('当前返现比例')}:
            <span className='font-medium text-gray-900'>
              {Number(summary?.invite_topup_rebate_rate || 0) / 100}%
            </span>
          </div>
        </Card>

        <Card className='!rounded-xl' title={t('邀请用户列表')}>
          <Table
            columns={inviteUsersColumns}
            dataSource={inviteUsers}
            loading={inviteUsersLoading}
            rowKey='id'
            size='small'
            pagination={{
              currentPage: inviteUsersPage,
              pageSize: inviteUsersPageSize,
              total: inviteUsersTotal,
              pageSizeOpts: [10, 20, 50],
              showSizeChanger: true,
              onPageChange: setInviteUsersPage,
              onPageSizeChange: (pageSize) => {
                setInviteUsersPageSize(pageSize);
                setInviteUsersPage(1);
              },
            }}
            empty={
              <Empty
                image={<IllustrationNoResult style={{ width: 120, height: 120 }} />}
                darkModeImage={
                  <IllustrationNoResultDark style={{ width: 120, height: 120 }} />
                }
                description={t('暂无邀请用户')}
              />
            }
          />
        </Card>

        <Card className='!rounded-xl' title={t('返现收益记录')}>
          <Table
            columns={rebateColumns}
            dataSource={rebates}
            loading={rebatesLoading}
            rowKey='id'
            size='small'
            pagination={{
              currentPage: rebatesPage,
              pageSize: rebatesPageSize,
              total: rebatesTotal,
              pageSizeOpts: [10, 20, 50],
              showSizeChanger: true,
              onPageChange: setRebatesPage,
              onPageSizeChange: (pageSize) => {
                setRebatesPageSize(pageSize);
                setRebatesPage(1);
              },
            }}
            empty={
              <Empty
                image={<IllustrationNoResult style={{ width: 120, height: 120 }} />}
                darkModeImage={
                  <IllustrationNoResultDark style={{ width: 120, height: 120 }} />
                }
                description={t('暂无返现记录')}
              />
            }
          />
        </Card>
      </div>
    </SideSheet>
  );
};

export default UserInviteRebateModal;
