/*
* Copyright (c) 2021 PSPACE, inc. KSAN Development Team ksan@pspace.co.kr
* KSAN is a suite of free software: you can redistribute it and/or modify it under the terms of
* the GNU General Public License as published by the Free Software Foundation, either version
* 3 of the License.  See LICENSE for details
*
* 본 프로그램 및 관련 소스코드, 문서 등 모든 자료는 있는 그대로 제공이 됩니다.
* KSAN 프로젝트의 개발자 및 개발사는 이 프로그램을 사용한 결과에 따른 어떠한 책임도 지지 않습니다.
* KSAN 개발팀은 사전 공지, 허락, 동의 없이 KSAN 개발에 관련된 모든 결과물에 대한 LICENSE 방식을 변경 할 권리가 있습니다.
 */
package main

import (
	"fmt"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"

	_ "server/docs"
)

type LogVariables struct {
	UserName     string
	ObjectName   string
	TargetName   string
	TargetValues []string
}

// User Log
type UserLogMessageId struct {
	UserCreate              int
	UserCreateFail          int
	UserUpdate              int
	UserUpdateFail          int
	UserDelete              int
	UserDeleteFail          int
	GroupAssign             int
	GroupAssignFail         int
	S3CredentialsCreate     int
	S3CredentialsCreateFail int
	S3CredentialsDelete     int
	S3CredentialsDeleteFail int
}
type UserLogMessageStrings struct {
	UserCreate              string
	UserCreateFail          string
	UserUpdate              string
	UserUpdateFail          string
	UserDelete              string
	UserDeleteFail          string
	GroupAssign             string
	GroupAssignFail         string
	S3CredentialsCreate     string
	S3CredentialsCreateFail string
	S3CredentialsDelete     string
	S3CredentialsDeleteFail string
}

var userLogMessageId = UserLogMessageId{
	UserCreate:              1,
	UserCreateFail:          2,
	UserUpdate:              3,
	UserUpdateFail:          4,
	UserDelete:              5,
	UserDeleteFail:          6,
	GroupAssign:             7,
	GroupAssignFail:         8,
	S3CredentialsCreate:     9,
	S3CredentialsCreateFail: 10,
	S3CredentialsDelete:     11,
	S3CredentialsDeleteFail: 12,
}

var userLogMessageStrings = UserLogMessageStrings{
	UserCreate:              " created user ",
	UserCreateFail:          " failed to create user ",
	UserUpdate:              " updated user ",
	UserUpdateFail:          " failed to update user ",
	UserDelete:              " deleted user ",
	UserDeleteFail:          " failed to delete user ",
	GroupAssign:             " assigned user %s to groups: ",
	GroupAssignFail:         " failed to assign user %s to groups: ",
	S3CredentialsCreate:     " created S3 credentials for user ",
	S3CredentialsCreateFail: " failed to create S3 credentials for user ",
	S3CredentialsDelete:     " deleted S3 credentials for user ",
	S3CredentialsDeleteFail: " failed to delete S3 credentials for user ",
}

// Group Log
type GroupLogMessageId struct {
	GroupCreate     int
	GroupCreateFail int
	GroupUpdate     int
	GroupUpdateFail int
	GroupDelete     int
	GroupDeleteFail int
	UserAssign      int
	UserAssignFail  int
}

type GroupLogMessageStrings struct {
	GroupCreate     string
	GroupCreateFail string
	GroupUpdate     string
	GroupUpdateFail string
	GroupDelete     string
	GroupDeleteFail string
	UserAssign      string
	UserAssignFail  string
}

var groupLogMessageId = GroupLogMessageId{
	GroupCreate:     1,
	GroupCreateFail: 2,
	GroupUpdate:     3,
	GroupUpdateFail: 4,
	GroupDelete:     5,
	GroupDeleteFail: 6,
	UserAssign:      7,
	UserAssignFail:  8,
}

var groupLogMessageStrings = GroupLogMessageStrings{
	GroupCreate:     " created group ",
	GroupCreateFail: " failed to create group ",
	GroupUpdate:     " updated group ",
	GroupUpdateFail: " failed to update group ",
	GroupDelete:     " deleted group ",
	GroupDeleteFail: " failed to delete group ",
	UserAssign:      " assigned users: %s to group ",
	UserAssignFail:  " failed to assign users: %s to group ",
}

// CHAP User Log
type ChapUserLogMessageId struct {
	ChapUserCreate     int
	ChapUserCreateFail int
	ChapUserUpdate     int
	ChapUserUpdateFail int
	ChapUserDelete     int
	ChapUserDeleteFail int
}

type ChapUserLogMessageStrings struct {
	ChapUserCreate     string
	ChapUserCreateFail string
	ChapUserUpdate     string
	ChapUserUpdateFail string
	ChapUserDelete     string
	ChapUserDeleteFail string
}

var chapUserLogMessageId = ChapUserLogMessageId{
	ChapUserCreate:     1,
	ChapUserCreateFail: 2,
	ChapUserUpdate:     3,
	ChapUserUpdateFail: 4,
	ChapUserDelete:     5,
	ChapUserDeleteFail: 6,
}

var chapUserLogMessageStrings = ChapUserLogMessageStrings{
	ChapUserCreate:     " created CHAP user ",
	ChapUserCreateFail: " failed to create CHAP user ",
	ChapUserUpdate:     " updated CHAP user ",
	ChapUserUpdateFail: " failed to update CHAP user ",
	ChapUserDelete:     " deleted CHAP user ",
	ChapUserDeleteFail: " failed to delete CHAP user ",
}

// Settings System
type SettingsSystemLogMessageId struct {
	HostnameChange                int
	HostnameChangeFail            int
	ManagementInterfaceChange     int
	ManagementInterfaceChangeFail int
	TimeDateChangeNTP             int
	TimeDateChangeNTPFail         int
	TimeDateChangeManual          int
	TimeDateChangeManualFail      int
}

type SettingsSystemLogMessageStrings struct {
	HostnameChange                string
	HostnameChangeFail            string
	ManagementInterfaceChange     string
	ManagementInterfaceChangeFail string
	TimeDateChangeNTP             string
	TimeDateChangeNTPFail         string
	TimeDateChangeManual          string
	TimeDateChangeManualFail      string
}

var settingsSystemLogMessageId = SettingsSystemLogMessageId{
	HostnameChange:                1,
	HostnameChangeFail:            2,
	ManagementInterfaceChange:     3,
	ManagementInterfaceChangeFail: 4,
	TimeDateChangeNTP:             5,
	TimeDateChangeNTPFail:         6,
	TimeDateChangeManual:          7,
	TimeDateChangeManualFail:      8,
}

var settingsSystemLogMessageStrings = SettingsSystemLogMessageStrings{
	HostnameChange:                " changed hostname to ",
	HostnameChangeFail:            " failed to change hostname to ",
	ManagementInterfaceChange:     " changed management interface to ",
	ManagementInterfaceChangeFail: " failed to change management interface to ",
	TimeDateChangeNTP:             " turned on NTP synchronization and set timezone to '%s'",
	TimeDateChangeNTPFail:         " failed to turn on NTP synchronization and set timezone to '%s'",
	TimeDateChangeManual:          " changed datetime to '%s' and timezone to '%s'",
	TimeDateChangeManualFail:      " failed to change datetime to '%s' and timezone to '%s'",
}

// Settings Network
type SettingsNetworkLogMessageId struct {
	Activate       int
	ActivateFail   int
	Deactivate     int
	DeactivateFail int
	Update         int
	UpdateFail     int
	BondCreate     int
	BondCreateFail int
	BondDelete     int
	BondDeleteFail int
	VlanCreate     int
	VlanCreateFail int
	VlanDelete     int
	VlanDeleteFail int
}

type SettingsNetworkLogMessageStrings struct {
	Activate       string
	ActivateFail   string
	Deactivate     string
	DeactivateFail string
	Update         string
	UpdateFail     string
	BondCreate     string
	BondCreateFail string
	BondDelete     string
	BondDeleteFail string
	VlanCreate     string
	VlanCreateFail string
	VlanDelete     string
	VlanDeleteFail string
}

var settingsNetworkLogMessageId = SettingsNetworkLogMessageId{
	Activate:       1,
	ActivateFail:   2,
	Deactivate:     3,
	DeactivateFail: 4,
	Update:         5,
	UpdateFail:     6,
	BondCreate:     7,
	BondCreateFail: 8,
	BondDelete:     9,
	BondDeleteFail: 10,
	VlanCreate:     11,
	VlanCreateFail: 12,
	VlanDelete:     13,
	VlanDeleteFail: 14,
}

var settingsNetworkLogMessageStrings = SettingsNetworkLogMessageStrings{
	Activate:       " activated connection ",
	ActivateFail:   " failed to activate connection ",
	Deactivate:     " deactivated connection ",
	DeactivateFail: " failed to deactivate connection ",
	Update:         " updated connection '%s' %s using DHCP ",
	UpdateFail:     " failed to update connection '%s' %s using DHCP ",
	BondCreate:     " created bond connection %s, slaves: ",
	BondCreateFail: " failed to create bond connection %s, slaves: ",
	BondDelete:     " deleted bond connection ",
	BondDeleteFail: " failed to delete bond connection ",
	VlanCreate:     " created VLAN interface ",
	VlanCreateFail: " failed to create VLAN interface ",
	VlanDelete:     " deleted VLAN interface ",
	VlanDeleteFail: " failed to delete VLAN interface ",
}

// SMB
type SMBLogMessageId struct {
	SMBCreate           int
	SMBCreateFail       int
	SMBUpdate           int
	SMBUpdateFail       int
	SMBDelete           int
	SMBDeleteFail       int
	SMBUserAdd          int
	SMBUserAddFail      int
	SMBUserDelete       int
	SMBUserDeleteFail   int
	SMBGroupAdd         int
	SMBGroupAddFail     int
	SMBGroupDelete      int
	SMBGroupDeleteFail  int
	SMBConfigUpdate     int
	SMBConfigUpdateFail int
	SMBServiceStart     int
	SMBServiceStop      int
	SMBShareEnable      int
	SMBShareEnableFail  int
	SMBShareDisable     int
	SMBShareDisableFail int
}

type SMBLogMessageStrings struct {
	SMBCreate           string
	SMBCreateFail       string
	SMBUpdate           string
	SMBUpdateFail       string
	SMBDelete           string
	SMBDeleteFail       string
	SMBUserAdd          string
	SMBUserAddFail      string
	SMBUserDelete       string
	SMBUserDeleteFail   string
	SMBGroupAdd         string
	SMBGroupAddFail     string
	SMBGroupDelete      string
	SMBGroupDeleteFail  string
	SMBConfigUpdate     string
	SMBConfigUpdateFail string
	SMBServiceStart     string
	SMBServiceStop      string
	SMBShareEnable      string
	SMBShareEnableFail  string
	SMBShareDisable     string
	SMBShareDisableFail string
}

var smbLogMessageId = SMBLogMessageId{
	SMBCreate:           1,
	SMBCreateFail:       2,
	SMBUpdate:           3,
	SMBUpdateFail:       4,
	SMBDelete:           5,
	SMBDeleteFail:       6,
	SMBUserAdd:          7,
	SMBUserAddFail:      8,
	SMBUserDelete:       9,
	SMBUserDeleteFail:   10,
	SMBGroupAdd:         11,
	SMBGroupAddFail:     12,
	SMBGroupDelete:      13,
	SMBGroupDeleteFail:  14,
	SMBConfigUpdate:     15,
	SMBConfigUpdateFail: 16,
	SMBServiceStart:     16,
	SMBServiceStop:      17,
	SMBShareEnable:      18,
	SMBShareEnableFail:  19,
	SMBShareDisable:     20,
	SMBShareDisableFail: 21,
}

var smbLogMessageStrings = SMBLogMessageStrings{
	SMBCreate:           " created SMB share '%s'",
	SMBCreateFail:       " failed to create SMB share '%s'",
	SMBUpdate:           " updated SMB share '%s'",
	SMBUpdateFail:       " failed to update SMB share '%s'",
	SMBDelete:           " deleted SMB share '%s'",
	SMBDeleteFail:       " failed to delete SMB share '%s'",
	SMBUserAdd:          " added user(s) '%s' to SMB share '%s'",
	SMBUserAddFail:      " failed to add user(s) '%s' to SMB share '%s'",
	SMBUserDelete:       " deleted user(s) '%s' from SMB share '%s'",
	SMBUserDeleteFail:   " failed to delete user(s) '%s' from SMB share '%s'",
	SMBGroupAdd:         " added group(s) '%s' to SMB share '%s'",
	SMBGroupAddFail:     " failed to add group(s) '%s' to SMB share '%s'",
	SMBGroupDelete:      " deleted group(s) '%s' from SMB share '%s'",
	SMBGroupDeleteFail:  " failed to delete group(s) '%s' from SMB share '%s'",
	SMBConfigUpdate:     " updated SMB configuration",
	SMBConfigUpdateFail: " failed to update SMB configuration",
	SMBServiceStart:     " started SMB service",
	SMBServiceStop:      " stopped SMB service",
	SMBShareEnable:      " enabled SMB share '%s'",
	SMBShareEnableFail:  " failed to enable SMB share '%s'",
	SMBShareDisable:     " disabled SMB share '%s'",
	SMBShareDisableFail: " failed to disable SMB share '%s'",
}

// Login (Authentication)
type LoginLogMessageId struct {
	LoginSuccess int
	LoginFail    int
	Logout       int
}

type LoginLogMessageStrings struct {
	LoginSuccess string
	LoginFail    string
	Logout       string
}

var loginLogMessageId = LoginLogMessageId{
	LoginSuccess: 1,
	LoginFail:    2,
	Logout:       3,
}

var loginLogMessageStrings = LoginLogMessageStrings{
	LoginSuccess: " user '%s' successfully logged in",
	LoginFail:    " user failed to log in",
	Logout:       " user '%s' logged out",
}

// S3
type S3LogMessageId struct {
	S3SetConfig     int
	S3SetConfigFail int
}

type S3LogMessageStrings struct {
	S3SetConfig     string
	S3SetConfigFail string
}

var s3LogMessageId = S3LogMessageId{
	S3SetConfig:     1,
	S3SetConfigFail: 2,
}

var s3LogMessageStrings = S3LogMessageStrings{
	S3SetConfig:     " updated S3 configuration",
	S3SetConfigFail: " failed to update S3 configuration",
}

// NFS
type NFSLogMessageId struct {
	NFSConfigUpdate         int
	NFSConfigUpdateFail     int
	NFSServiceStart         int
	NFSServiceStartFail     int
	NFSServiceStop          int
	NFSServiceStopFail      int
	NFSCreateExport         int
	NFSCreateExportFail     int
	NFSDeleteExport         int
	NFSDeleteExportFail     int
	NFSUpdateExport         int
	NFSUpdateExportFail     int
	NFSAddPermission        int
	NFSAddPermissionFail    int
	NFSUpdatePermission     int
	NFSUpdatePermissionFail int
	NFSDeletePermission     int
	NFSDeletePermissionFail int
	NFSEnableExport         int
	NFSEnableExportFail     int
	NFSDisableExport        int
	NFSDisableExportFail    int
}

type NFSLogMessageStrings struct {
	NFSConfigUpdate         string
	NFSConfigUpdateFail     string
	NFSServiceStart         string
	NFSServiceStartFail     string
	NFSServiceStop          string
	NFSServiceStopFail      string
	NFSCreateExport         string
	NFSCreateExportFail     string
	NFSDeleteExport         string
	NFSDeleteExportFail     string
	NFSUpdateExport         string
	NFSUpdateExportFail     string
	NFSAddPermission        string
	NFSAddPermissionFail    string
	NFSUpdatePermission     string
	NFSUpdatePermissionFail string
	NFSDeletePermission     string
	NFSDeletePermissionFail string
	NFSEnableExport         string
	NFSEnableExportFail     string
	NFSDisableExport        string
	NFSDisableExportFail    string
}

var nfsLogMessageId = NFSLogMessageId{
	NFSConfigUpdate:         1,
	NFSConfigUpdateFail:     2,
	NFSServiceStart:         3,
	NFSServiceStartFail:     4,
	NFSServiceStop:          5,
	NFSServiceStopFail:      6,
	NFSCreateExport:         7,
	NFSCreateExportFail:     8,
	NFSDeleteExport:         9,
	NFSDeleteExportFail:     10,
	NFSUpdateExport:         11,
	NFSUpdateExportFail:     12,
	NFSAddPermission:        13,
	NFSAddPermissionFail:    14,
	NFSUpdatePermission:     15,
	NFSUpdatePermissionFail: 16,
	NFSDeletePermission:     17,
	NFSDeletePermissionFail: 18,
	NFSEnableExport:         19,
	NFSEnableExportFail:     20,
	NFSDisableExport:        21,
	NFSDisableExportFail:    22,
}

var nfsLogMessageStrings = NFSLogMessageStrings{
	NFSConfigUpdate:         " updated NFS configuration",
	NFSConfigUpdateFail:     " failed to update NFS configuration",
	NFSServiceStart:         " started NFS service",
	NFSServiceStartFail:     " failed to start NFS service",
	NFSServiceStop:          " stopped NFS service",
	NFSServiceStopFail:      " failed to stop NFS service",
	NFSCreateExport:         " created NFS export '%s'",
	NFSCreateExportFail:     " failed to create NFS export '%s'",
	NFSDeleteExport:         " deleted NFS export '%s'",
	NFSDeleteExportFail:     " failed to delete NFS export '%s'",
	NFSUpdateExport:         " updated NFS export '%s'",
	NFSUpdateExportFail:     " failed to update NFS export '%s'",
	NFSAddPermission:        " added permission '%s' to NFS export '%s'",
	NFSAddPermissionFail:    " failed to add permission '%s' to NFS export '%s'",
	NFSUpdatePermission:     " updated permission '%s' on NFS export '%s'",
	NFSUpdatePermissionFail: " failed to update permission '%s' on NFS export '%s'",
	NFSDeletePermission:     " deleted permission '%s' from NFS export '%s'",
	NFSDeletePermissionFail: " failed to delete permission '%s' from NFS export '%s'",
	NFSEnableExport:         " enabled NFS export '%s'",
	NFSEnableExportFail:     " failed to enable NFS export '%s'",
	NFSDisableExport:        " disabled NFS export '%s'",
	NFSDisableExportFail:    " failed to disable NFS export '%s'",
}

// ZFS Pool
type ZPoolLogMessageId struct {
	ZPoolCreate                     int
	ZPoolCreateFail                 int
	ZPoolDestroy                    int
	ZPoolDestroyFail                int
	ZPoolAddDiskGroup               int
	ZPoolAddDiskGroupFail           int
	ZPoolRemoveDiskGroup            int
	ZPoolRemoveDiskGroupFail        int
	ZPoolAddLogDisk                 int
	ZPoolAddLogDiskFail             int
	ZPoolRemoveLogDisk              int
	ZPoolRemoveLogDiskFail          int
	ZPoolAddCacheDisk               int
	ZPoolAddCacheDiskFail           int
	ZPoolRemoveCacheDisk            int
	ZPoolRemoveCacheDiskFail        int
	ZPoolAddSpareDisk               int
	ZPoolAddSpareDiskFail           int
	ZPoolRemoveSpareDisk            int
	ZPoolRemoveSpareDiskFail        int
	ZPoolAddDeviceToMirror          int
	ZPoolAddDeviceToMirrorFail      int
	ZPoolRemoveDeviceFromMirror     int
	ZPoolRemoveDeviceFromMirrorFail int
	ZPoolExport                     int
	ZPoolExportFail                 int
	ZPoolImport                     int
	ZPoolImportFail                 int
	ZPoolDiskReplace                int
	ZPoolDiskReplaceFail            int
}

type ZPoolLogMessageStrings struct {
	ZPoolCreate                     string
	ZPoolCreateFail                 string
	ZPoolDestroy                    string
	ZPoolDestroyFail                string
	ZPoolAddDiskGroup               string
	ZPoolAddDiskGroupFail           string
	ZPoolRemoveDiskGroup            string
	ZPoolRemoveDiskGroupFail        string
	ZPoolAddLogDisk                 string
	ZPoolAddLogDiskFail             string
	ZPoolRemoveLogDisk              string
	ZPoolRemoveLogDiskFail          string
	ZPoolAddCacheDisk               string
	ZPoolAddCacheDiskFail           string
	ZPoolRemoveCacheDisk            string
	ZPoolRemoveCacheDiskFail        string
	ZPoolAddSpareDisk               string
	ZPoolAddSpareDiskFail           string
	ZPoolRemoveSpareDisk            string
	ZPoolRemoveSpareDiskFail        string
	ZPoolAddDeviceToMirror          string
	ZPoolAddDeviceToMirrorFail      string
	ZPoolRemoveDeviceFromMirror     string
	ZPoolRemoveDeviceFromMirrorFail string
	ZPoolExport                     string
	ZPoolExportFail                 string
	ZPoolImport                     string
	ZPoolImportFail                 string
	ZPoolDiskReplace                string
	ZPoolDiskReplaceFail            string
}

var zPoolLogMessageId = ZPoolLogMessageId{
	ZPoolCreate:                     1,
	ZPoolCreateFail:                 2,
	ZPoolDestroy:                    3,
	ZPoolDestroyFail:                4,
	ZPoolAddDiskGroup:               5,
	ZPoolAddDiskGroupFail:           6,
	ZPoolRemoveDiskGroup:            7,
	ZPoolRemoveDiskGroupFail:        8,
	ZPoolAddLogDisk:                 9,
	ZPoolAddLogDiskFail:             10,
	ZPoolRemoveLogDisk:              11,
	ZPoolRemoveLogDiskFail:          12,
	ZPoolAddCacheDisk:               13,
	ZPoolAddCacheDiskFail:           14,
	ZPoolRemoveCacheDisk:            15,
	ZPoolRemoveCacheDiskFail:        16,
	ZPoolAddSpareDisk:               17,
	ZPoolAddSpareDiskFail:           18,
	ZPoolRemoveSpareDisk:            19,
	ZPoolRemoveSpareDiskFail:        20,
	ZPoolAddDeviceToMirror:          21,
	ZPoolAddDeviceToMirrorFail:      22,
	ZPoolRemoveDeviceFromMirror:     23,
	ZPoolRemoveDeviceFromMirrorFail: 24,
	ZPoolExport:                     25,
	ZPoolExportFail:                 26,
	ZPoolImport:                     27,
	ZPoolImportFail:                 28,
	ZPoolDiskReplace:                29,
	ZPoolDiskReplaceFail:            30,
}

var zPoolLogMessageStrings = ZPoolLogMessageStrings{
	ZPoolCreate:                     " created pool '%s'",
	ZPoolCreateFail:                 " failed to create pool '%s'",
	ZPoolDestroy:                    " destroyed pool '%s'",
	ZPoolDestroyFail:                " failed to destroy pool '%s'",
	ZPoolAddDiskGroup:               " added a new disk group to pool '%s'",
	ZPoolAddDiskGroupFail:           " failed to add a new disk group to pool '%s'",
	ZPoolRemoveDiskGroup:            " removed a disk group from pool '%s'",
	ZPoolRemoveDiskGroupFail:        " failed to remove a disk group from pool '%s'",
	ZPoolAddLogDisk:                 " added a new log disk to pool '%s'",
	ZPoolAddLogDiskFail:             " failed to add a new log disk to pool '%s'",
	ZPoolRemoveLogDisk:              " removed a log disk from pool '%s'",
	ZPoolRemoveLogDiskFail:          " failed to remove a log disk from pool '%s'",
	ZPoolAddCacheDisk:               " added a new cache disk to pool '%s'",
	ZPoolAddCacheDiskFail:           " failed to add a new cache disk to pool '%s'",
	ZPoolRemoveCacheDisk:            " removed a cache disk from pool '%s'",
	ZPoolRemoveCacheDiskFail:        " failed to remove a cache disk from pool '%s'",
	ZPoolAddSpareDisk:               " added a new spare disk to pool '%s'",
	ZPoolAddSpareDiskFail:           " failed to add a new spare disk to pool '%s'",
	ZPoolRemoveSpareDisk:            " removed a spare disk from pool '%s'",
	ZPoolRemoveSpareDiskFail:        " failed to remove a spare disk from pool '%s'",
	ZPoolAddDeviceToMirror:          " added a new device to mirror disk group '%s' in pool '%s'",
	ZPoolAddDeviceToMirrorFail:      " failed to add a new device to mirror disk group '%s' in pool '%s'",
	ZPoolRemoveDeviceFromMirror:     " removed a device from mirror disk group '%s' in pool '%s'",
	ZPoolRemoveDeviceFromMirrorFail: " failed to remove a device from mirror disk group '%s' in pool '%s'",
	ZPoolExport:                     " exported pool '%s'",
	ZPoolExportFail:                 " failed to export pool '%s'",
	ZPoolImport:                     " imported pool '%s'",
	ZPoolImportFail:                 " failed to import pool '%s'",
	ZPoolDiskReplace:                " replaced disk '%s' with disk '%s' in pool '%s'",
	ZPoolDiskReplaceFail:            " failed to replace disk '%s' with disk '%s' in pool '%s'",
}

// ZFS Dataset
type ZFileSystemLogMessageId struct {
	ZFileSystemCreate      int
	ZFileSystemCreateFail  int
	ZFileSystemDestroy     int
	ZFileSystemDestroyFail int
}

type ZFileSystemLogMessageStrings struct {
	ZFileSystemCreate      string
	ZFileSystemCreateFail  string
	ZFileSystemDestroy     string
	ZFileSystemDestroyFail string
}

var zFileSystemLogMessageId = ZFileSystemLogMessageId{
	ZFileSystemCreate:      1,
	ZFileSystemCreateFail:  2,
	ZFileSystemDestroy:     3,
	ZFileSystemDestroyFail: 4,
}

var zFileSystemLogMessageStrings = ZFileSystemLogMessageStrings{
	ZFileSystemCreate:      " created dataset '%s' in pool '%s'",
	ZFileSystemCreateFail:  " failed to create dataset '%s' in pool '%s'",
	ZFileSystemDestroy:     " destroyed dataset '%s' in pool '%s'",
	ZFileSystemDestroyFail: " failed to destroy dataset '%s' in pool '%s'",
}

// ZFS Snapshot
type ZSnapshotLogMessageId struct {
	ZSnapshotCreate       int
	ZSnapshotCreateFail   int
	ZSnapshotDestroy      int
	ZSnapshotDestroyFail  int
	ZSnapshotRollback     int
	ZSnapshotRollbackFail int
	ZSnapshotClone        int
	ZSnapshotCloneFail    int
}

type ZSnapshotLogMessageStrings struct {
	ZSnapshotCreate       string
	ZSnapshotCreateFail   string
	ZSnapshotDestroy      string
	ZSnapshotDestroyFail  string
	ZSnapshotRollback     string
	ZSnapshotRollbackFail string
	ZSnapshotClone        string
	ZSnapshotCloneFail    string
}

var zSnapshotLogMessageId = ZSnapshotLogMessageId{
	ZSnapshotCreate:       1,
	ZSnapshotCreateFail:   2,
	ZSnapshotDestroy:      3,
	ZSnapshotDestroyFail:  4,
	ZSnapshotRollback:     5,
	ZSnapshotRollbackFail: 6,
	ZSnapshotClone:        7,
	ZSnapshotCloneFail:    8,
}

var zSnapshotLogMessageStrings = ZSnapshotLogMessageStrings{
	ZSnapshotCreate:       " created snapshot '%s'",
	ZSnapshotCreateFail:   " failed to create snapshot '%s'",
	ZSnapshotDestroy:      " destroyed snapshot '%s'",
	ZSnapshotDestroyFail:  " failed to destroy snapshot '%s'",
	ZSnapshotRollback:     " rolled back dataset '%s' in pool '%s' to snapshot '%s'",
	ZSnapshotRollbackFail: " failed to roll back dataset '%s' in pool '%s' to snapshot '%s'",
	ZSnapshotClone:        " cloned snapshot '%s' to dataset '%s' in pool '%s'",
	ZSnapshotCloneFail:    " failed to clone snapshot '%s' to dataset '%s' in pool '%s'",
}

type ZScrubLogMessageId struct {
	ZScrubStart              int
	ZScrubStartFail          int
	ZScrubStop               int
	ZScrubStopFail           int
	ZScrubSchedulerStart     int
	ZScrubSchedulerStartFail int
	ZScrubSchedulerStop      int
	ZScrubSchedulerStopFail  int
}

type ZScrubLogMessageStrings struct {
	ZScrubStart              string
	ZScrubStartFail          string
	ZScrubStop               string
	ZScrubStopFail           string
	ZScrubSchedulerStart     string
	ZScrubSchedulerStartFail string
	ZScrubSchedulerStop      string
	ZScrubSchedulerStopFail  string
}

var zScrubLogMessageId = ZScrubLogMessageId{
	ZScrubStart:              1,
	ZScrubStartFail:          2,
	ZScrubStop:               3,
	ZScrubStopFail:           4,
	ZScrubSchedulerStart:     5,
	ZScrubSchedulerStartFail: 6,
	ZScrubSchedulerStop:      7,
	ZScrubSchedulerStopFail:  8,
}

var zScrubLogMessageStrings = ZScrubLogMessageStrings{
	ZScrubStart:              " started scrub on pool '%s'",
	ZScrubStartFail:          " failed to start scrub on pool '%s'",
	ZScrubStop:               " stopped scrub on pool '%s'",
	ZScrubStopFail:           " failed to stop scrub on pool '%s'",
	ZScrubSchedulerStart:     " create a scrub scheduler for pool '%s'",
	ZScrubSchedulerStartFail: " failed to create a scrub scheduler for pool '%s'",
	ZScrubSchedulerStop:      " delete a scrub scheduler for pool '%s'",
	ZScrubSchedulerStopFail:  " failed to delete a scrub scheduler for pool '%s'",
}

type LogConfig struct {
	Id          string    `json:"id" db:"Id"`
	ProcessName string    `json:"process_name" db:"ProcessName"`
	Facility    string    `json:"facility" db:"Facility"`
	LogLevel    int       `json:"log_level" db:"LogLevel"`
	UpdateDate  time.Time `json:"update_date" db:"UpdateDate"`
}

func printToLog(Priority int, Message string) {
	// select log configuration from database
	logConf := LogConfig{}

	query := "SELECT * FROM SYSTEM_CONF_LOG ORDER BY UpdateDate DESC LIMIT 1"
	err := conn.Get(&logConf, query)

	if err != nil {
		fmt.Println("Error: ", err)
	}

	LogProcessName = logConf.ProcessName

	if Priority <= logConf.LogLevel {
		switch Priority {
		case LogPriority.Emergency:
			sysLog.Emerg(Message)
			break
		case LogPriority.Alert:
			sysLog.Alert(Message)
			break
		case LogPriority.Critical:
			sysLog.Crit(Message)
			break
		case LogPriority.Error:
			sysLog.Err(Message)
			break
		case LogPriority.Warning:
			sysLog.Warning(Message)
			break
		case LogPriority.Notice:
			sysLog.Notice(Message)
			break
		case LogPriority.Info:
			sysLog.Info(Message)
			break
		case LogPriority.Debug:
			sysLog.Debug(Message)
			break
		}
	}
}

func UIRequestLog(Message string) {
	sysLog.Notice(Message)
}

func UserLogMessage(Priority int, LogMessage int, logVariables LogVariables) {
	var Message string
	if LogMessage == userLogMessageId.UserCreate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + userLogMessageStrings.UserCreate + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " user created"
		}
	}

	if LogMessage == userLogMessageId.UserCreateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + userLogMessageStrings.UserCreateFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " user creation failed"
		}
	}

	if LogMessage == userLogMessageId.UserUpdate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + userLogMessageStrings.UserUpdate + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " user updated"
		}
	}

	if LogMessage == userLogMessageId.UserUpdateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + userLogMessageStrings.UserUpdateFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " user update failed"
		}
	}

	if LogMessage == userLogMessageId.UserDelete {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + userLogMessageStrings.UserDelete + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " user deleted"
		}
	}

	if LogMessage == userLogMessageId.UserDeleteFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + userLogMessageStrings.UserDeleteFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " user deletion failed"
		}
	}

	if LogMessage == userLogMessageId.GroupAssign {
		if logVariables.ObjectName != "" {
			if logVariables.TargetName != "" {
				Message = fmt.Sprintf("["+LogProcessName+"]"+userLogMessageStrings.GroupAssign+logVariables.TargetName, logVariables.ObjectName)
			} else {
				Message = "[" + LogProcessName + "]" + " unassigned " + logVariables.ObjectName + " from all groups"
			}
		} else {
			Message = "[" + LogProcessName + "]" + " user assigned to group"
		}
	}

	if LogMessage == userLogMessageId.GroupAssignFail {
		if logVariables.ObjectName != "" {
			if logVariables.TargetName != "" {
				Message = fmt.Sprintf("["+LogProcessName+"]"+userLogMessageStrings.GroupAssignFail+logVariables.TargetName, logVariables.ObjectName)
			} else {
				Message = "[" + LogProcessName + "]" + " failed to unassign " + logVariables.ObjectName + " from all groups"
			}
		} else {
			Message = "[" + LogProcessName + "]" + " user assignment to group failed"
		}
	}

	if LogMessage == userLogMessageId.S3CredentialsCreate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + userLogMessageStrings.S3CredentialsCreate + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " S3 credentials created"
		}
	}

	if LogMessage == userLogMessageId.S3CredentialsCreateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + userLogMessageStrings.S3CredentialsCreateFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " S3 credentials creation failed"
		}
	}

	if LogMessage == userLogMessageId.S3CredentialsDelete {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + userLogMessageStrings.S3CredentialsDelete + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " S3 credentials deleted"
		}
	}

	if LogMessage == userLogMessageId.S3CredentialsDeleteFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + userLogMessageStrings.S3CredentialsDeleteFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " S3 credentials deletion failed"
		}
	}

	printToLog(Priority, Message)
}

func GroupLogMessage(Priority int, LogMessage int, logVariables LogVariables) {
	var Message string

	if LogMessage == groupLogMessageId.GroupCreate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + groupLogMessageStrings.GroupCreate + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " group created"
		}
	}

	if LogMessage == groupLogMessageId.GroupCreateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + groupLogMessageStrings.GroupCreateFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " group creation failed"
		}
	}

	if LogMessage == groupLogMessageId.GroupUpdate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + groupLogMessageStrings.GroupUpdate + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " group updated"
		}
	}

	if LogMessage == groupLogMessageId.GroupUpdateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + groupLogMessageStrings.GroupUpdateFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " group update failed"
		}
	}

	if LogMessage == groupLogMessageId.GroupDelete {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + groupLogMessageStrings.GroupDelete + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " group deleted"
		}
	}

	if LogMessage == groupLogMessageId.GroupDeleteFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + groupLogMessageStrings.GroupDeleteFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " group deletion failed"
		}
	}

	if LogMessage == groupLogMessageId.UserAssign {
		if logVariables.ObjectName != "" {
			if logVariables.TargetName != "" {
				Message = fmt.Sprintf("["+LogProcessName+"]"+groupLogMessageStrings.UserAssign+logVariables.ObjectName, logVariables.TargetName)
			} else {
				Message = "[" + LogProcessName + "]" + " unassigned all users from " + logVariables.ObjectName
			}
		} else {
			Message = "[" + LogProcessName + "]" + " group assigned to group"
		}
	}

	if LogMessage == groupLogMessageId.UserAssignFail {
		if logVariables.ObjectName != "" {
			if logVariables.TargetName != "" {
				Message = fmt.Sprintf("["+LogProcessName+"]"+groupLogMessageStrings.UserAssignFail+logVariables.ObjectName, logVariables.TargetName)
			} else {
				Message = "[" + LogProcessName + "]" + " failed to unassign all users from " + logVariables.ObjectName
			}
		} else {
			Message = "[" + LogProcessName + "]" + " group assignment to group failed"
		}
	}

	printToLog(Priority, Message)
}

func ChapUserLogMessage(Priority int, LogMessage int, logVariables LogVariables) {
	var Message string

	if LogMessage == chapUserLogMessageId.ChapUserCreate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + chapUserLogMessageStrings.ChapUserCreate + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " CHAP user created"
		}
	}

	if LogMessage == chapUserLogMessageId.ChapUserCreateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + chapUserLogMessageStrings.ChapUserCreateFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " CHAP user creation failed"
		}
	}

	if LogMessage == chapUserLogMessageId.ChapUserUpdate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + chapUserLogMessageStrings.ChapUserUpdate + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " CHAP user updated"
		}
	}

	if LogMessage == chapUserLogMessageId.ChapUserUpdateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + chapUserLogMessageStrings.ChapUserUpdateFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " CHAP user update failed"
		}
	}

	if LogMessage == chapUserLogMessageId.ChapUserDelete {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + chapUserLogMessageStrings.ChapUserDelete + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " CHAP user deleted"
		}
	}

	if LogMessage == chapUserLogMessageId.ChapUserDeleteFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + chapUserLogMessageStrings.ChapUserDeleteFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " CHAP user deletion failed"
		}
	}

	printToLog(Priority, Message)
}

func SettingsSystemLogMessage(Priority int, LogMessage int, logVariables LogVariables) {
	var Message string

	if LogMessage == settingsSystemLogMessageId.HostnameChange {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsSystemLogMessageStrings.HostnameChange + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " hostname changed"
		}
	}

	if LogMessage == settingsSystemLogMessageId.HostnameChangeFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsSystemLogMessageStrings.HostnameChangeFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " hostname change failed"
		}
	}

	if LogMessage == settingsSystemLogMessageId.ManagementInterfaceChange {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsSystemLogMessageStrings.ManagementInterfaceChange + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " management interface changed"
		}
	}

	if LogMessage == settingsSystemLogMessageId.ManagementInterfaceChangeFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsSystemLogMessageStrings.ManagementInterfaceChangeFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " management interface change failed"
		}
	}

	if LogMessage == settingsSystemLogMessageId.TimeDateChangeNTP {
		if logVariables.TargetValues != nil {
			Message = fmt.Sprintf("["+LogProcessName+"]"+settingsSystemLogMessageStrings.TimeDateChangeNTP, logVariables.TargetValues[0])
		} else {
			Message = "[" + LogProcessName + "]" + " turned on NTP syncronization"
		}
	}

	if LogMessage == settingsSystemLogMessageId.TimeDateChangeNTPFail {
		if logVariables.TargetValues != nil {
			Message = fmt.Sprintf("["+LogProcessName+"]"+settingsSystemLogMessageStrings.TimeDateChangeNTP, logVariables.TargetValues[0])
		} else {
			Message = "[" + LogProcessName + "]" + " failed to turn on NTP syncronization"
		}
	}

	if LogMessage == settingsSystemLogMessageId.TimeDateChangeManual {
		if logVariables.TargetValues != nil {
			Message = fmt.Sprintf("["+LogProcessName+"]"+settingsSystemLogMessageStrings.TimeDateChangeManual, logVariables.TargetValues[0], logVariables.TargetValues[1])
		} else {
			Message = "[" + LogProcessName + "]" + " turned off NTP syncronization"
		}
	}

	if LogMessage == settingsSystemLogMessageId.TimeDateChangeManualFail {
		if logVariables.TargetValues != nil {
			Message = fmt.Sprintf("["+LogProcessName+"]"+settingsSystemLogMessageStrings.TimeDateChangeManualFail, logVariables.TargetValues[0], logVariables.TargetValues[1])
		} else {
			Message = "[" + LogProcessName + "]" + " failed to turn off NTP syncronization"
		}
	}

	printToLog(Priority, Message)
}

func SettingsNetworkLogMessage(Priority int, LogMessage int, logVariables LogVariables) {
	var Message string

	if LogMessage == settingsNetworkLogMessageId.Activate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsNetworkLogMessageStrings.Activate + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " connection activated"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.ActivateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsNetworkLogMessageStrings.ActivateFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " connection activation failed"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.Deactivate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsNetworkLogMessageStrings.Deactivate + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " connection deactivated"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.DeactivateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsNetworkLogMessageStrings.DeactivateFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " connection deactivation failed"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.Update {
		if logVariables.ObjectName != "" && logVariables.TargetValues != nil {
			var Prefix string
			if logVariables.TargetValues[0] == "YES" {
				Prefix = ""
			} else {
				Prefix = "not"
			}
			Message = fmt.Sprintf("["+LogProcessName+"]"+settingsNetworkLogMessageStrings.Update, logVariables.ObjectName, Prefix)
		} else {
			Message = "[" + LogProcessName + "]" + " connection modified"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.UpdateFail {
		if logVariables.ObjectName != "" && logVariables.TargetValues != nil {
			var Prefix string
			if logVariables.TargetValues[0] == "YES" {
				Prefix = ""
			} else {
				Prefix = "not"
			}
			Message = fmt.Sprintf("["+LogProcessName+"]"+settingsNetworkLogMessageStrings.UpdateFail, logVariables.ObjectName, Prefix)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to modify connection"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.BondCreate {
		if logVariables.ObjectName != "" && logVariables.TargetValues != nil {
			Message = fmt.Sprintf("["+LogProcessName+"]"+settingsNetworkLogMessageStrings.BondCreate+logVariables.TargetValues[0], logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " bond connection created"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.BondCreateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsNetworkLogMessageStrings.BondCreateFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " failed to create a bond connection"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.BondDelete {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsNetworkLogMessageStrings.BondDelete + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " bond connection deleted"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.BondDeleteFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsNetworkLogMessageStrings.BondDeleteFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " failed to delete a bond connection"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.VlanCreate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsNetworkLogMessageStrings.VlanCreate + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " VLAN interface created"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.VlanCreateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsNetworkLogMessageStrings.VlanCreateFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " failed to create a VLAN interface"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.VlanDelete {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsNetworkLogMessageStrings.VlanDelete + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " VLAN interface deleted"
		}
	}

	if LogMessage == settingsNetworkLogMessageId.VlanDeleteFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + settingsNetworkLogMessageStrings.VlanDeleteFail + logVariables.ObjectName
		} else {
			Message = "[" + LogProcessName + "]" + " failed to delete a VLAN interface"
		}
	}

	printToLog(Priority, Message)
}

func LogChangeLogMessage(Priority int, LogMessage string, LogLevel int) {
	var LogLevelToString string

	switch LogLevel {
	case 0:
		LogLevelToString = "Emergency"
		break
	case 1:
		LogLevelToString = "Alert"
		break
	case 2:
		LogLevelToString = "Critical"
		break
	case 3:
		LogLevelToString = "Error"
		break
	case 4:
		LogLevelToString = "Warning"
		break
	case 5:
		LogLevelToString = "Notice"
		break
	case 6:
		LogLevelToString = "Info"
		break
	case 7:
		LogLevelToString = "Debug"
		break
	}

	printToLog(Priority, fmt.Sprintf("["+LogProcessName+"] "+LogMessage, LogLevelToString))
}

func SMBLogMessage(Priority int, LogMessage int, logVariables LogVariables) {
	var Message string

	if LogMessage == smbLogMessageId.SMBCreate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBCreate, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " share created"
		}
	}

	if LogMessage == smbLogMessageId.SMBCreateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBCreateFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to create share"
		}
	}

	if LogMessage == smbLogMessageId.SMBDelete {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBDelete, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " share deleted"
		}
	}

	if LogMessage == smbLogMessageId.SMBDeleteFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBDeleteFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to delete share"
		}
	}

	if LogMessage == smbLogMessageId.SMBUpdate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBUpdate, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " share modified"
		}
	}

	if LogMessage == smbLogMessageId.SMBUpdateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBUpdateFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to modify share"
		}
	}

	if LogMessage == smbLogMessageId.SMBUserAdd {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBUserAdd, strings.Join(logVariables.TargetValues, ", "), logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " user(s) added to share"
		}
	}

	if LogMessage == smbLogMessageId.SMBUserAddFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBUserAddFail, strings.Join(logVariables.TargetValues, ", "), logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to add user(s) to share"
		}
	}

	if LogMessage == smbLogMessageId.SMBUserDelete {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBUserDelete, logVariables.TargetName, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " user(s) removed from share"
		}
	}

	if LogMessage == smbLogMessageId.SMBUserDeleteFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBUserDeleteFail, logVariables.TargetName, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to remove user(s) from share"
		}
	}

	if LogMessage == smbLogMessageId.SMBGroupAdd {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBGroupAdd, strings.Join(logVariables.TargetValues, ", "), logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " group(s) added to share"
		}
	}

	if LogMessage == smbLogMessageId.SMBGroupAddFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBGroupAddFail, strings.Join(logVariables.TargetValues, ", "), logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to add group(s) to share"
		}
	}

	if LogMessage == smbLogMessageId.SMBGroupDelete {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBGroupDelete, logVariables.TargetName, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " group(s) removed from share"
		}
	}

	if LogMessage == smbLogMessageId.SMBGroupDeleteFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBGroupDeleteFail, logVariables.TargetName, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to remove group(s) from share"
		}
	}

	if LogMessage == smbLogMessageId.SMBConfigUpdate {
		Message = "[" + LogProcessName + "]" + smbLogMessageStrings.SMBConfigUpdate
	}

	if LogMessage == smbLogMessageId.SMBConfigUpdateFail {
		Message = "[" + LogProcessName + "]" + smbLogMessageStrings.SMBConfigUpdateFail
	}

	if LogMessage == smbLogMessageId.SMBServiceStart {
		Message = "[" + LogProcessName + "]" + smbLogMessageStrings.SMBServiceStart
	}

	if LogMessage == smbLogMessageId.SMBServiceStop {
		Message = "[" + LogProcessName + "]" + smbLogMessageStrings.SMBServiceStop
	}

	if LogMessage == smbLogMessageId.SMBShareEnable {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBShareEnable, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " share enabled"
		}
	}

	if LogMessage == smbLogMessageId.SMBShareEnableFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBShareEnableFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to enable share"
		}
	}

	if LogMessage == smbLogMessageId.SMBShareDisable {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBShareDisable, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " share disabled"
		}
	}

	if LogMessage == smbLogMessageId.SMBShareDisableFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(smbLogMessageStrings.SMBShareDisableFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to disable share"
		}
	}

	printToLog(Priority, Message)
}

func S3LogMessage(Priority int, LogMessage int) {
	var Message string

	if LogMessage == s3LogMessageId.S3SetConfig {
		Message = "[" + LogProcessName + "]" + s3LogMessageStrings.S3SetConfig
	}

	if LogMessage == s3LogMessageId.S3SetConfigFail {
		Message = "[" + LogProcessName + "]" + s3LogMessageStrings.S3SetConfigFail
	}

	printToLog(Priority, Message)
}

func KSANLogMessage(Priority int, Message string) {
	printToLog(Priority, "["+LogProcessName+"]"+Message)
}

func LoginLogMessage(Priority int, LogMessage int, logVariables LogVariables) {
	var Message string

	if LogMessage == loginLogMessageId.LoginSuccess {
		Message = "[" + LogProcessName + "]" + fmt.Sprintf(loginLogMessageStrings.LoginSuccess, logVariables.ObjectName)
	}

	if LogMessage == loginLogMessageId.LoginFail {
		Message = "[" + LogProcessName + "]" + fmt.Sprintf(loginLogMessageStrings.LoginFail)
	}

	if LogMessage == loginLogMessageId.Logout {
		Message = "[" + LogProcessName + "]" + fmt.Sprintf(loginLogMessageStrings.Logout, logVariables.ObjectName)
	}

	printToLog(Priority, Message)
}

func NFSLogMessage(Priority int, LogMessage int, logVariables LogVariables) {
	var Message string

	if LogMessage == nfsLogMessageId.NFSConfigUpdate {
		Message = "[" + LogProcessName + "]" + nfsLogMessageStrings.NFSConfigUpdate
	}

	if LogMessage == nfsLogMessageId.NFSConfigUpdateFail {
		Message = "[" + LogProcessName + "]" + nfsLogMessageStrings.NFSConfigUpdateFail
	}

	if LogMessage == nfsLogMessageId.NFSServiceStart {
		Message = "[" + LogProcessName + "]" + nfsLogMessageStrings.NFSServiceStart
	}

	if LogMessage == nfsLogMessageId.NFSServiceStop {
		Message = "[" + LogProcessName + "]" + nfsLogMessageStrings.NFSServiceStop
	}

	if LogMessage == nfsLogMessageId.NFSCreateExport {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSCreateExport, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " created NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSCreateExportFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSCreateExportFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to create NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSDeleteExport {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSDeleteExport, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " deleted NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSDeleteExportFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSDeleteExportFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to delete NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSUpdateExport {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSUpdateExport, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " updated NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSUpdateExportFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSUpdateExportFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to update NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSAddPermission {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSAddPermission, logVariables.TargetName, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " added permission to NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSAddPermissionFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSAddPermissionFail, logVariables.TargetName, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to add permission to NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSUpdatePermission {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSUpdatePermission, logVariables.TargetName, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " updated permission to NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSUpdatePermissionFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSUpdatePermissionFail, logVariables.TargetName, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to update permission to NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSDeletePermission {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSDeletePermission, logVariables.TargetName, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " removed permission from NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSDeletePermissionFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSDeletePermissionFail, logVariables.TargetName, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to remove permission from NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSEnableExport {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSEnableExport, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " enabled NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSEnableExportFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSEnableExportFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to enable NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSDisableExport {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSDisableExport, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " disabled NFS export"
		}
	}

	if LogMessage == nfsLogMessageId.NFSDisableExportFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(nfsLogMessageStrings.NFSDisableExportFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to disable NFS export"
		}
	}

	printToLog(Priority, Message)
}

func ZPoolLogMessage(Priority int, LogMessage int, logVariables LogVariables) {
	var Message string

	if LogMessage == zPoolLogMessageId.ZPoolCreate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolCreate, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " created pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolCreateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolCreateFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to create pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolDestroy {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolDestroy, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " deleted pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolDestroyFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolDestroyFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to delete pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolAddDiskGroup {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolAddDiskGroup, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " added disk group to pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolAddDiskGroupFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolAddDiskGroupFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to add disk group to pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolRemoveDiskGroup {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolRemoveDiskGroup, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " removed disk group from pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolRemoveDiskGroupFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolRemoveDiskGroupFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to remove disk group from pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolAddDeviceToMirror {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolAddDeviceToMirror, logVariables.ObjectName, logVariables.TargetName)
		} else {
			Message = "[" + LogProcessName + "]" + " added device to mirror in pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolAddDeviceToMirrorFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolAddDeviceToMirrorFail, logVariables.ObjectName, logVariables.TargetName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to add device to mirror in pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolRemoveDeviceFromMirror {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolRemoveDeviceFromMirror, logVariables.ObjectName, logVariables.TargetName)
		} else {
			Message = "[" + LogProcessName + "]" + " removed device from mirror in pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolRemoveDeviceFromMirrorFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolRemoveDeviceFromMirrorFail, logVariables.ObjectName, logVariables.TargetName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to remove device from mirror in pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolAddLogDisk {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolAddLogDisk, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " added log disk to pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolAddLogDiskFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolAddLogDiskFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to add log disk to pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolRemoveLogDisk {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolRemoveLogDisk, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " removed log disk from pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolRemoveLogDiskFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolRemoveLogDiskFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to remove log disk from pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolAddCacheDisk {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolAddCacheDisk, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " added cache disk to pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolAddCacheDiskFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolAddCacheDiskFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to add cache disk to pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolRemoveCacheDisk {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolRemoveCacheDisk, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " removed cache disk from pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolRemoveCacheDiskFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolRemoveCacheDiskFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to remove cache disk from pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolAddSpareDisk {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolAddSpareDisk, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " added spare disk to pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolAddSpareDiskFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolAddSpareDiskFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to add spare disk to pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolRemoveSpareDisk {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolRemoveSpareDisk, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " removed spare disk from pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolRemoveSpareDiskFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolRemoveSpareDiskFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to remove spare disk from pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolExport {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolExport, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " exported pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolExportFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolExportFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to export pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolImport {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolImport, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " imported pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolImportFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolImportFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to import pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolDiskReplace {
		if logVariables.ObjectName != "" && len(logVariables.TargetValues) > 1 {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolDiskReplace, logVariables.TargetValues[0], logVariables.TargetValues[1], logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " replaced disk in pool"
		}
	}

	if LogMessage == zPoolLogMessageId.ZPoolDiskReplaceFail {
		if logVariables.ObjectName != "" && len(logVariables.TargetValues) > 1 {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zPoolLogMessageStrings.ZPoolDiskReplaceFail, logVariables.TargetValues[0], logVariables.TargetValues[1], logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to replace disk in pool"
		}
	}

	printToLog(Priority, Message)
}

func ZFileSystemLogMessage(Priority int, LogMessage int, logVariables LogVariables) {
	var Message string

	if LogMessage == zFileSystemLogMessageId.ZFileSystemCreate {
		if logVariables.ObjectName != "" && logVariables.TargetName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zFileSystemLogMessageStrings.ZFileSystemCreate, logVariables.ObjectName, logVariables.TargetName)
		} else {
			Message = "[" + LogProcessName + "]" + " created dataset"
		}
	}

	if LogMessage == zFileSystemLogMessageId.ZFileSystemCreateFail {
		if logVariables.ObjectName != "" && logVariables.TargetName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zFileSystemLogMessageStrings.ZFileSystemCreateFail, logVariables.ObjectName, logVariables.TargetName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to create dataset"
		}
	}

	if LogMessage == zFileSystemLogMessageId.ZFileSystemDestroy {
		if logVariables.ObjectName != "" && logVariables.TargetName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zFileSystemLogMessageStrings.ZFileSystemDestroy, logVariables.ObjectName, logVariables.TargetName)
		} else {
			Message = "[" + LogProcessName + "]" + " destroyed dataset"
		}
	}

	if LogMessage == zFileSystemLogMessageId.ZFileSystemDestroyFail {
		if logVariables.ObjectName != "" && logVariables.TargetName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zFileSystemLogMessageStrings.ZFileSystemDestroyFail, logVariables.ObjectName, logVariables.TargetName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to destroy dataset"
		}
	}

	printToLog(Priority, Message)
}

func ZSnapshotLogMessage(Priority int, LogMessage int, logVariables LogVariables) {
	var Message string

	if LogMessage == zSnapshotLogMessageId.ZSnapshotCreate {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zSnapshotLogMessageStrings.ZSnapshotCreate, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " created snapshot"
		}
	}

	if LogMessage == zSnapshotLogMessageId.ZSnapshotCreateFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zSnapshotLogMessageStrings.ZSnapshotCreateFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to create snapshot"
		}
	}

	if LogMessage == zSnapshotLogMessageId.ZSnapshotDestroy {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zSnapshotLogMessageStrings.ZSnapshotDestroy, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " destroyed snapshot"
		}
	}

	if LogMessage == zSnapshotLogMessageId.ZSnapshotDestroyFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zSnapshotLogMessageStrings.ZSnapshotDestroyFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to destroy snapshot"
		}
	}

	if LogMessage == zSnapshotLogMessageId.ZSnapshotRollback {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zSnapshotLogMessageStrings.ZSnapshotRollback, logVariables.TargetValues[0], logVariables.TargetValues[1], logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " rolled back snapshot"
		}
	}

	if LogMessage == zSnapshotLogMessageId.ZSnapshotRollbackFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zSnapshotLogMessageStrings.ZSnapshotRollbackFail, logVariables.TargetValues[0], logVariables.TargetValues[1], logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to rollback snapshot"
		}
	}

	if LogMessage == zSnapshotLogMessageId.ZSnapshotClone {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zSnapshotLogMessageStrings.ZSnapshotClone, logVariables.ObjectName, logVariables.TargetValues[0], logVariables.TargetValues[1])
		} else {
			Message = "[" + LogProcessName
		}
	}

	if LogMessage == zSnapshotLogMessageId.ZSnapshotCloneFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zSnapshotLogMessageStrings.ZSnapshotCloneFail, logVariables.ObjectName, logVariables.TargetValues[0], logVariables.TargetValues[1])
		} else {
			Message = "[" + LogProcessName + "]" + " failed to clone snapshot"
		}
	}

	printToLog(Priority, Message)
}

func ZScrubLogMessage(Priority int, LogMessage int, logVariables LogVariables) {
	var Message string

	if LogMessage == zScrubLogMessageId.ZScrubStart {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zScrubLogMessageStrings.ZScrubStart, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " scrub started"
		}
	}

	if LogMessage == zScrubLogMessageId.ZScrubStartFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zScrubLogMessageStrings.ZScrubStartFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to start scrub"
		}
	}

	if LogMessage == zScrubLogMessageId.ZScrubStop {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zScrubLogMessageStrings.ZScrubStop, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " scrub stopped"
		}
	}

	if LogMessage == zScrubLogMessageId.ZScrubStopFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zScrubLogMessageStrings.ZScrubStopFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to stop scrub"
		}
	}

	if LogMessage == zScrubLogMessageId.ZScrubSchedulerStart {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zScrubLogMessageStrings.ZScrubSchedulerStart, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " scrub scheduler started"
		}
	}

	if LogMessage == zScrubLogMessageId.ZScrubSchedulerStartFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zScrubLogMessageStrings.ZScrubSchedulerStartFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to start scrub scheduler"
		}
	}

	if LogMessage == zScrubLogMessageId.ZScrubSchedulerStop {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zScrubLogMessageStrings.ZScrubSchedulerStop, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " scrub scheduler stopped"
		}
	}

	if LogMessage == zScrubLogMessageId.ZScrubSchedulerStopFail {
		if logVariables.ObjectName != "" {
			Message = "[" + LogProcessName + "]" + fmt.Sprintf(zScrubLogMessageStrings.ZScrubSchedulerStopFail, logVariables.ObjectName)
		} else {
			Message = "[" + LogProcessName + "]" + " failed to stop scrub scheduler"
		}
	}

	printToLog(Priority, Message)
}
