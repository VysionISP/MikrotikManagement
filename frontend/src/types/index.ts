export type Role = 'SUPERADMIN' | 'USER';
export type OrgRole = 'ADMIN' | 'MANAGER' | 'VIEWER';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'WARNING';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  _count?: { sites: number; members: number };
  members?: OrganizationMember[];
}

export interface OrganizationMember {
  id: number;
  userId: number;
  organizationId: number;
  role: OrgRole;
  user?: Pick<User, 'id' | 'username' | 'email'>;
}

export interface Site {
  id: number;
  name: string;
  description?: string;
  organizationId: number;
  createdAt: string;
  _count?: { devices: number };
  devices?: Device[];
}

export interface Device {
  id: number;
  name: string;
  ipAddress: string;
  apiPort: number;
  model?: string;
  version?: string;
  status: DeviceStatus;
  siteId: number;
  createdAt: string;
  updatedAt: string;
  metrics?: DeviceMetric[];
}

export interface DeviceMetric {
  id: number;
  deviceId: number;
  cpuLoad?: number;
  memoryUsed?: number;
  totalMemory?: number;
  uptime?: number;
  timestamp: string;
}

export interface SystemResources {
  uptime: string;
  uptimeSeconds: number;
  cpuLoad: number;
  memoryUsed: number;
  totalMemory: number;
  boardName: string;
  version: string;
}

export interface InterfaceInfo {
  name: string;
  type: string;
  macAddress: string;
  running: boolean;
  disabled: boolean;
  txByte: number;
  rxByte: number;
  txPacket: number;
  rxPacket: number;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
