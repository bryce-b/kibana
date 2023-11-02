/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LegacyAPMLink, APMLinkExtendProps } from '../apm_link';

interface Props extends APMLinkExtendProps {
  serviceName: string;
  errorGroupId: string;
}

function CrashDetailLink({ serviceName, errorGroupId, ...rest }: Props) {
  return (
    <LegacyAPMLink
      path={`/mobile-services/${serviceName}/crashes/${errorGroupId}`}
      {...rest}
    />
  );
}

export { CrashDetailLink };
