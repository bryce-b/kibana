/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiToolTip,
  RIGHT_ALIGNMENT,
  LEFT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import React, { useMemo } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/i18n';
import { asInteger } from '../../../../../../common/utils/formatters';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import { truncate } from '../../../../../utils/style';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../../../shared/charts/helper/get_timeseries_color';
import { SparkPlot } from '../../../../shared/charts/spark_plot';
import { ErrorDetailLink } from '../../../../shared/links/apm/error_detail_link';
import { ErrorOverviewLink } from '../../../../shared/links/apm/error_overview_link';
import { ITableColumn, ManagedTable } from '../../../../shared/managed_table';
import { TimestampTooltip } from '../../../../shared/timestamp_tooltip';
import { isTimeComparison } from '../../../../shared/time_comparison/get_comparison_options';

const MessageAndCulpritCell = euiStyled.div`
  ${truncate('100%')};
`;

const ErrorLink = euiStyled(ErrorOverviewLink)`
  ${truncate('100%')};
`;

const MessageLink = euiStyled(ErrorDetailLink)`
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  font-size: ${({ theme }) => theme.eui.euiFontSizeM};
  ${truncate('100%')};
`;

type ErrorGroupItem =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/errors/groups/main_statistics'>['errorGroups'][0];
type ErrorGroupDetailedStatistics =
  APIReturnType<'POST /internal/apm/mobile-services/{serviceName}/errors/groups/detailed_statistics'>;

interface Props {
  mainStatistics: ErrorGroupItem[];
  serviceName: string;
  detailedStatisticsLoading: boolean;
  detailedStatistics: ErrorGroupDetailedStatistics;
  initialSortField: string;
  initialSortDirection: 'asc' | 'desc';
  comparisonEnabled?: boolean;
  isLoading: boolean;
}

function MobileErrorGroupList({
  mainStatistics,
  serviceName,
  detailedStatisticsLoading,
  detailedStatistics,
  comparisonEnabled,
  initialSortField,
  initialSortDirection,
  isLoading,
}: Props) {
  const { query } = useApmParams('/mobile-services/{serviceName}/errors');
  const { offset } = query;
  const columns = useMemo(() => {
    return [
      {
        name: i18n.translate('xpack.apm.errorsTable.typeColumnLabel', {
          defaultMessage: 'Type',
        }),
        field: 'type',
        sortable: false,
        render: (_, { type }) => {
          return (
            <ErrorLink
              title={type}
              serviceName={serviceName}
              query={{
                ...query,
                kuery: `error.exception.type:"${type}"`,
              }}
            >
              {type}
            </ErrorLink>
          );
        },
      },
      {
        name: i18n.translate(
          'xpack.apm.errorsTable.errorMessageAndCulpritColumnLabel',
          {
            defaultMessage: 'Error message and culprit',
          }
        ),
        field: 'message',
        sortable: false,
        width: '30%',
        render: (_, item: ErrorGroupItem) => {
          return (
            <MessageAndCulpritCell>
              <EuiToolTip
                id="error-message-tooltip"
                content={item.name || NOT_AVAILABLE_LABEL}
              >
                <MessageLink
                  serviceName={serviceName}
                  errorGroupId={item.groupId}
                >
                  {item.name || NOT_AVAILABLE_LABEL}
                </MessageLink>
              </EuiToolTip>
            </MessageAndCulpritCell>
          );
        },
      },
      {
        name: '',
        field: 'handled',
        sortable: false,
        align: RIGHT_ALIGNMENT,
        render: (_, { handled }) =>
          handled === false && (
            <EuiBadge color="warning">
              {i18n.translate('xpack.apm.errorsTable.unhandledLabel', {
                defaultMessage: 'Unhandled',
              })}
            </EuiBadge>
          ),
      },
      {
        field: 'lastSeen',
        sortable: true,
        name: i18n.translate('xpack.apm.errorsTable.lastSeenColumnLabel', {
          defaultMessage: 'Last seen',
        }),
        align: LEFT_ALIGNMENT,
        render: (_, { lastSeen }) =>
          lastSeen ? (
            <TimestampTooltip time={lastSeen} timeUnit="minutes" />
          ) : (
            NOT_AVAILABLE_LABEL
          ),
      },
      {
        field: 'occurrences',
        name: i18n.translate('xpack.apm.errorsTable.occurrencesColumnLabel', {
          defaultMessage: 'Occurrences',
        }),
        sortable: true,
        dataType: 'number',
        align: RIGHT_ALIGNMENT,
        render: (_, { occurrences, groupId }) => {
          const currentPeriodTimeseries =
            detailedStatistics?.currentPeriod?.[groupId]?.timeseries;
          const previousPeriodTimeseries =
            detailedStatistics?.previousPeriod?.[groupId]?.timeseries;
          const { currentPeriodColor, previousPeriodColor } =
            getTimeSeriesColor(ChartType.FAILED_TRANSACTION_RATE);

          return (
            <SparkPlot
              type="bar"
              color={currentPeriodColor}
              isLoading={detailedStatisticsLoading}
              series={currentPeriodTimeseries}
              valueLabel={i18n.translate(
                'xpack.apm.serviceOverview.errorsTableOccurrences',
                {
                  defaultMessage: `{occurrences} occ.`,
                  values: {
                    occurrences: asInteger(occurrences),
                  },
                }
              )}
              comparisonSeries={
                comparisonEnabled && isTimeComparison(offset)
                  ? previousPeriodTimeseries
                  : undefined
              }
              comparisonSeriesColor={previousPeriodColor}
            />
          );
        },
      },
    ] as Array<ITableColumn<ErrorGroupItem>>;
  }, [
    serviceName,
    query,
    detailedStatistics,
    comparisonEnabled,
    detailedStatisticsLoading,
    offset,
  ]);
  return (
    <ManagedTable
      noItemsMessage={
        isLoading
          ? i18n.translate('xpack.apm.errorsTable.loading', {
              defaultMessage: 'Loading...',
            })
          : i18n.translate('xpack.apm.errorsTable.noErrorsLabel', {
              defaultMessage: 'No errors found',
            })
      }
      items={mainStatistics}
      columns={columns}
      initialSortField={initialSortField}
      initialSortDirection={initialSortDirection}
      sortItems={false}
      initialPageSize={25}
      isLoading={isLoading}
    />
  );
}

export { MobileErrorGroupList };
