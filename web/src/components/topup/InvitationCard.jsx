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
  Avatar,
  Typography,
  Card,
  Button,
  Input,
  Badge,
  Empty,
  Tag,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { Copy, Users, BarChart2, TrendingUp, Gift, Zap } from 'lucide-react';
import { API, copy, showError, timestamp2string } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import CardTable from '../common/ui/CardTable';

const { Text } = Typography;

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

function renderSingleLineText(value, extraClassName = '') {
  return (
    <div className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${extraClassName}`}>
      {value}
    </div>
  );
}

function renderTradeNoInput(value, t) {
  return (
    <div className='w-full min-w-0 max-w-[260px]'>
      <Input
        readOnly
        value={value || ''}
        size='small'
        suffix={
          <Button
            theme='borderless'
            size='small'
            type='tertiary'
            icon={<Copy size={14} />}
            aria-label={t('复制订单号')}
            onClick={async (e) => {
              e.stopPropagation();
              await copy(value || '');
            }}
          />
        }
      />
    </div>
  );
}

const InvitationCard = ({
  t,
  userState,
  renderQuota,
  setOpenTransfer,
  affLink,
  handleAffLinkClick,
  standalone = false,
}) => {
  const isMobile = useIsMobile();
  const [inviteRate, setInviteRate] = useState(0);
  const [inviteUsers, setInviteUsers] = useState([]);
  const [inviteUsersLoading, setInviteUsersLoading] = useState(false);
  const [inviteUsersPage, setInviteUsersPage] = useState(1);
  const [inviteUsersPageSize, setInviteUsersPageSize] = useState(10);
  const [inviteUsersTotal, setInviteUsersTotal] = useState(0);

  const [inviteRebates, setInviteRebates] = useState([]);
  const [inviteRebatesLoading, setInviteRebatesLoading] = useState(false);
  const [inviteRebatesPage, setInviteRebatesPage] = useState(1);
  const [inviteRebatesPageSize, setInviteRebatesPageSize] = useState(10);
  const [inviteRebatesTotal, setInviteRebatesTotal] = useState(0);

  const loadInviteSummary = async () => {
    try {
      const res = await API.get('/api/user/invite/summary');
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      setInviteRate(Number(data?.invite_topup_rebate_rate || 0) / 100);
    } catch (error) {
      showError(t('加载邀请信息失败'));
    }
  };

  const loadInviteUsers = async (
    page = inviteUsersPage,
    pageSize = inviteUsersPageSize,
  ) => {
    setInviteUsersLoading(true);
    try {
      const res = await API.get(
        `/api/user/invite/users?p=${page}&page_size=${pageSize}`,
      );
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      setInviteUsers(data?.items || []);
      setInviteUsersTotal(data?.total || 0);
    } catch (error) {
      showError(t('加载邀请用户失败'));
    } finally {
      setInviteUsersLoading(false);
    }
  };

  const loadInviteRebates = async (
    page = inviteRebatesPage,
    pageSize = inviteRebatesPageSize,
  ) => {
    setInviteRebatesLoading(true);
    try {
      const res = await API.get(
        `/api/user/invite/rebates?p=${page}&page_size=${pageSize}`,
      );
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      setInviteRebates(data?.items || []);
      setInviteRebatesTotal(data?.total || 0);
    } catch (error) {
      showError(t('加载返现记录失败'));
    } finally {
      setInviteRebatesLoading(false);
    }
  };

  useEffect(() => {
    loadInviteSummary();
  }, []);

  useEffect(() => {
    loadInviteUsers(inviteUsersPage, inviteUsersPageSize);
  }, [inviteUsersPage, inviteUsersPageSize]);

  useEffect(() => {
    loadInviteRebates(inviteRebatesPage, inviteRebatesPageSize);
  }, [inviteRebatesPage, inviteRebatesPageSize]);

  const inviteUsersColumns = useMemo(
    () => [
      {
        title: t('用户'),
        dataIndex: 'username',
        key: 'username',
        width: 220,
        render: (_, record) => (
          <div className='min-w-0'>
            {renderSingleLineText(
              renderInviteUserName(record),
              'font-medium text-sm',
            )}
            <div className='text-xs text-gray-500 mt-1'>ID: {record.id}</div>
          </div>
        ),
      },
      {
        title: t('状态'),
        dataIndex: 'has_topup',
        key: 'has_topup',
        width: 110,
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
        width: 120,
      },
      {
        title: t('累计返现'),
        dataIndex: 'total_rebate_quota',
        key: 'total_rebate_quota',
        width: 140,
        render: (value) => renderQuota(Number(value || 0)),
      },
      {
        title: t('最近充值时间'),
        dataIndex: 'last_topup_time',
        key: 'last_topup_time',
        width: 180,
        render: (value) => (value ? timestamp2string(value) : '-'),
      },
    ],
    [renderQuota, t],
  );

  const inviteRebateColumns = useMemo(
    () => [
      {
        title: t('时间'),
        dataIndex: 'created_at',
        key: 'created_at',
        width: 180,
        render: (value) => timestamp2string(value),
      },
      {
        title: t('下级用户'),
        dataIndex: 'invitee_display',
        key: 'invitee_display',
        width: 180,
        render: (value) => renderSingleLineText(value || '-'),
      },
      {
        title: t('订单号'),
        dataIndex: 'trade_no',
        key: 'trade_no',
        width: 300,
        render: (value) => renderTradeNoInput(value, t),
      },
      {
        title: t('到账额度'),
        dataIndex: 'credited_quota',
        key: 'credited_quota',
        width: 140,
        render: (value) => renderQuota(Number(value || 0)),
      },
      {
        title: t('返现比例'),
        dataIndex: 'rebate_rate_bp',
        key: 'rebate_rate_bp',
        width: 120,
        render: (value) => `${Number(value || 0) / 100}%`,
      },
      {
        title: t('返现金额'),
        dataIndex: 'rebate_quota',
        key: 'rebate_quota',
        width: 140,
        render: (value) => renderQuota(Number(value || 0)),
      },
    ],
    [renderQuota, t],
  );

  const sectionHeaderStyle = {
    paddingBottom: 12,
    marginBottom: 16,
    borderBottom: '1px solid var(--semi-color-border)',
  };

  const sectionMetaStyle = {
    fontSize: 12,
    color: 'var(--semi-color-text-2)',
  };

  const outerCardClass = '!rounded-2xl shadow-sm border-0';
  const innerCardClass = '!rounded-xl w-full';
  const tableCardClass = '!rounded-2xl shadow-sm border-0';

  const renderInviteUsersCard = () => (
    <Card
      className={tableCardClass}
      bodyStyle={{ padding: isMobile ? 14 : 20 }}
    >
      <div style={sectionHeaderStyle}>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <div className='text-lg font-semibold'>{t('邀请用户列表')}</div>
            <div style={sectionMetaStyle}>
              {t('查看下级用户充值状态与累计返现贡献')}
            </div>
          </div>
          <Tag color='white'>{`${t('共')} ${inviteUsersTotal} ${t('人')}`}</Tag>
        </div>
      </div>

      <CardTable
        columns={inviteUsersColumns}
        dataSource={inviteUsers}
        loading={inviteUsersLoading}
        rowKey='id'
        scroll={{ x: 'max-content' }}
        pagination={{
          currentPage: inviteUsersPage,
          pageSize: inviteUsersPageSize,
          total: inviteUsersTotal,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
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
        className='rounded-xl overflow-hidden'
        size='middle'
      />
    </Card>
  );

  const renderInviteRebatesCard = () => (
    <Card
      className={tableCardClass}
      bodyStyle={{ padding: isMobile ? 14 : 20 }}
    >
      <div style={sectionHeaderStyle}>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <div className='text-lg font-semibold'>{t('返现收益记录')}</div>
            <div style={sectionMetaStyle}>
              {t('展示每笔充值返现的时间、订单和到账明细')}
            </div>
          </div>
          <Tag color='white'>{`${t('共')} ${inviteRebatesTotal} ${t('条')}`}</Tag>
        </div>
      </div>

      <CardTable
        columns={inviteRebateColumns}
        dataSource={inviteRebates}
        loading={inviteRebatesLoading}
        rowKey='id'
        scroll={{ x: 'max-content' }}
        pagination={{
          currentPage: inviteRebatesPage,
          pageSize: inviteRebatesPageSize,
          total: inviteRebatesTotal,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          onPageChange: setInviteRebatesPage,
          onPageSizeChange: (pageSize) => {
            setInviteRebatesPageSize(pageSize);
            setInviteRebatesPage(1);
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
        className='rounded-xl overflow-hidden'
        size='middle'
      />
    </Card>
  );

  return (
    <div className='w-full flex flex-col gap-6'>
      <Card className={outerCardClass} bodyStyle={{ padding: isMobile ? 14 : 20 }}>
        <div className='flex items-center mb-3'>
          <Avatar size='small' color='green' className='mr-3 shadow-md'>
            <Gift size={16} />
          </Avatar>
          <div>
            <Typography.Text className='text-lg font-medium'>
              {t('邀请奖励')}
            </Typography.Text>
            <div className='text-xs'>{t('邀请好友获得额外奖励')}</div>
          </div>
        </div>

        <div className='w-full flex flex-col gap-4'>
          <Card
            className={innerCardClass}
            bodyStyle={{ padding: isMobile ? 14 : 16 }}
            cover={
              <div
                className='relative'
                style={{
                  minHeight: isMobile ? 164 : 184,
                  '--palette-primary-darkerChannel': '0 75 80',
                  backgroundImage: `linear-gradient(0deg, rgba(var(--palette-primary-darkerChannel) / 80%), rgba(var(--palette-primary-darkerChannel) / 80%)), url('/cover-4.webp')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                <div className='relative z-10 h-full flex flex-col justify-between p-3 sm:p-4'>
                  <div className='flex justify-between items-center flex-wrap gap-2'>
                    <Text strong style={{ color: 'white', fontSize: '16px' }}>
                      {t('收益统计')}
                    </Text>
                    <Button
                      type='primary'
                      theme='solid'
                      size='small'
                      disabled={
                        !userState?.user?.aff_quota ||
                        userState?.user?.aff_quota <= 0
                      }
                      onClick={() => setOpenTransfer(true)}
                      className='!rounded-lg'
                    >
                      <Zap size={12} className='mr-1' />
                      {t('划转到余额')}
                    </Button>
                  </div>

                  <div className='grid grid-cols-3 gap-2 sm:gap-4 mt-3'>
                    <div className='text-center'>
                      <div
                        className='text-base sm:text-2xl font-bold mb-1'
                        style={{ color: 'white' }}
                      >
                        {renderQuota(userState?.user?.aff_quota || 0)}
                      </div>
                      <div className='flex items-center justify-center text-sm'>
                        <TrendingUp
                          size={14}
                          className='mr-1'
                          style={{ color: 'rgba(255,255,255,0.8)' }}
                        />
                        <Text
                          style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '12px',
                          }}
                        >
                          {t('待使用收益')}
                        </Text>
                      </div>
                    </div>

                    <div className='text-center'>
                      <div
                        className='text-base sm:text-2xl font-bold mb-1'
                        style={{ color: 'white' }}
                      >
                        {renderQuota(userState?.user?.aff_history_quota || 0)}
                      </div>
                      <div className='flex items-center justify-center text-sm'>
                        <BarChart2
                          size={14}
                          className='mr-1'
                          style={{ color: 'rgba(255,255,255,0.8)' }}
                        />
                        <Text
                          style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '12px',
                          }}
                        >
                          {t('总收益')}
                        </Text>
                      </div>
                    </div>

                    <div className='text-center'>
                      <div
                        className='text-base sm:text-2xl font-bold mb-1'
                        style={{ color: 'white' }}
                      >
                        {userState?.user?.aff_count || 0}
                      </div>
                      <div className='flex items-center justify-center text-sm'>
                        <Users
                          size={14}
                          className='mr-1'
                          style={{ color: 'rgba(255,255,255,0.8)' }}
                        />
                        <Text
                          style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '12px',
                          }}
                        >
                          {t('邀请人数')}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          >
            <Input
              value={affLink}
              readOnly
              className='!rounded-lg'
              prefix={t('邀请链接')}
              suffix={
                <Button
                  type='primary'
                  theme='solid'
                  onClick={handleAffLinkClick}
                  icon={<Copy size={14} />}
                  className='!rounded-lg'
                >
                  {t('复制')}
                </Button>
              }
            />
          </Card>

          <Card
            className={innerCardClass}
            bodyStyle={{ padding: isMobile ? 14 : 16 }}
            title={<Text type='tertiary'>{t('奖励说明')}</Text>}
          >
            <div className='space-y-2.5'>
              <div className='flex items-start gap-2'>
                <Badge dot type='success' />
                <Text type='tertiary' className='text-sm'>
                  {t('被邀请用户注册后可获得赠送额度，邀请人不会在注册时直接返现')}
                </Text>
              </div>
              <div className='flex items-start gap-2'>
                <Badge dot type='success' />
                <Text type='tertiary' className='text-sm'>
                  {t('下级用户充值成功后，系统会按照后台设置的比例结算返现')}
                  {inviteRate > 0 ? `（${inviteRate}%）` : ''}
                </Text>
              </div>
              <div className='flex items-start gap-2'>
                <Badge dot type='success' />
                <Text type='tertiary' className='text-sm'>
                  {t('通过划转功能将奖励额度转入到您的账户余额中')}
                </Text>
              </div>
            </div>
          </Card>
        </div>
      </Card>

      {standalone ? (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 items-start'>
          {renderInviteUsersCard()}
          {renderInviteRebatesCard()}
        </div>
      ) : (
        <>
          {renderInviteUsersCard()}
          {renderInviteRebatesCard()}
        </>
      )}
    </div>
  );
};

export default InvitationCard;
