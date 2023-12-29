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
	"bufio"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"unicode"

	"gopkg.in/pygz/subprocess.v1"
)

func networkInterfaceInfo(interface_name_init string) (*NetworkInterface, error) {
	var interface_name string
	interface_ip := "N/A"
	var interface_type1 string
	interface_type2 := ""
	interface_netmask := "N/A"
	interface_speed := "N/A"
	interface_status := "Inactive"
	interface_dhcp := "N/A"
	interface_gateway := "N/A"
	interface_mtu := "N/A"
	interface_mac := "N/A"
	interface_duplex := "N/A"
	// vlan
	interface_vlanparent := ""
	interface_vlanid := ""
	// bond
	interface_bondoptions := ""
	// bond slave
	interface_bondmaster := ""
	interface_slavetype := ""

	info1 := subprocess.Run("nmcli", "con", "show", interface_name_init)
	if info1.ExitCode != 0 {
		return nil, errors.New(info1.StdErr)
	} else {
		info1_lines := strings.Split(strings.ReplaceAll(info1.StdOut, "\r\n", "\n"), "\n")

		for _, info_line := range info1_lines {
			info_values := strings.Split(strings.ReplaceAll(info_line, " ", ""), ":")

			if len(info_values) < 2 {
				continue
			} else if info_values[0] == "connection.id" {
				interface_name = info_values[1]
			} else if info_values[0] == "ipv4.addresses" {
				if len(strings.Split(info_values[1], "/")) < 2 {
					continue
				} else {
					interface_ip = strings.Split(info_values[1], "/")[0]
					interface_netmask = strings.Split(info_values[1], "/")[1]
				}
			} else if info_values[0] == "connection.type" {
				if info_values[1] == "802-3-ethernet" {
					interface_type1 = "Physical"
				} else if info_values[1] == "bond" {
					interface_type1 = "Bond"
				} else if info_values[1] == "vlan" {
					interface_type1 = "VLAN"
				} else if info_values[1] == "bridge" {
					interface_type1 = "Bridged"
				} else {
					interface_type1 = info_values[1]
				}
			} else if info_values[0] == "ipv4.never-default" && interface_ip != "N/A" {
				if info_values[1] == "no" {
					interface_type2 = "Management"
				}
			} else if info_values[0] == "GENERAL.STATE" {
				if info_values[1] == "activated" {
					interface_status = "Active"
				} else {
					interface_status = "Inactive"
				}
			} else if info_values[0] == "ipv4.method" {
				if info_values[1] == "auto" {
					interface_dhcp = "YES"
				} else {
					interface_dhcp = "NO"
				}
			} else if info_values[0] == "ipv4.gateway" {
				interface_gateway = info_values[1]
			} else if info_values[0] == "vlan.parent" {
				interface_vlanparent = info_values[1]
			} else if info_values[0] == "vlan.id" {
				interface_vlanid = info_values[1]
			} else if info_values[0] == "bond.options" {
				interface_bondoptions = info_values[1]
			} else if info_values[0] == "connection.slave-type" {
				interface_slavetype = info_values[1]
			} else if info_values[0] == "connection.master" {
				interface_bondmaster = info_values[1]
			}
		}
	}

	info2 := subprocess.Run("ip", "addr", "show", interface_name_init)
	if info2.ExitCode != 0 {

	} else {
		info2_lines := strings.Split(strings.ReplaceAll(info2.StdOut, "\r\n", "\n"), "\n")
		for _, info_line := range info2_lines {
			if strings.Contains(info_line, "mtu") {
				interface_mtu = strings.Split(strings.Split(info_line, "mtu")[1], " ")[1]
			} else if strings.Contains(info_line, "link/ether") {
				interface_mac = strings.Split(strings.Split(info_line, "link/ether")[1], " ")[1]
			}
		}
	}

	info3 := subprocess.Run("ethtool", interface_name_init)
	if info3.ExitCode != 0 {

	} else {
		info3_lines := strings.Split(strings.ReplaceAll(info3.StdOut, "\r\n", "\n"), "\n")
		for _, info_line := range info3_lines {
			if strings.Contains(info_line, "Speed:") {
				interface_speed = strings.Split(info_line, ": ")[1]
			} else if strings.Contains(info_line, "Duplex:") {
				interface_duplex = strings.Split(info_line, ": ")[1]
			}
		}
	}
	if interface_gateway == "--" {
		interface_gateway = "N/A"
	}
	var interface_json NetworkInterface = NetworkInterface{Name: interface_name, IP: interface_ip, Type1: interface_type1, Type2: interface_type2, Netmask: interface_netmask, Speed: interface_speed, Status: interface_status, DHCP: interface_dhcp, Gateway: interface_gateway, MTU: interface_mtu, MAC: interface_mac, Duplex: interface_duplex,
		VLANParent: interface_vlanparent, VLANID: interface_vlanid, BondOptions: interface_bondoptions, SlaveOf: interface_bondmaster, SlaveType: interface_slavetype}
	return &interface_json, nil
}

func updateSMB() {
	var configSMB []string

	// get smb conf from database
	var config SMBConf
	err := conn.Get(&config, "SELECT * FROM SMB_GLOBAL_CONF ORDER BY UpdateDate DESC LIMIT 1")

	if err != nil {
		fmt.Println(err)
		return
	}

	configSMB = append(configSMB, "[global]")
	configSMB = append(configSMB, "security = user")
	configSMB = append(configSMB, "passdb backend = tdbsam")
	configSMB = append(configSMB, "workgroup = "+config.Workgroup)
	if config.ServerString != nil && *config.ServerString != "" {
		configSMB = append(configSMB, "server string = "+*config.ServerString)
	}
	if config.UseSendfile == "y" {
		configSMB = append(configSMB, "use sendfile = yes")
	} else {
		configSMB = append(configSMB, "use sendfile = no")
	}
	if config.UnixExtensions == "y" {
		configSMB = append(configSMB, "unix extensions = yes")
	} else {
		configSMB = append(configSMB, "unix extensions = no")
	}
	if config.StoreDosAttributes == "y" {
		configSMB = append(configSMB, "store dos attributes = yes")
	} else {
		configSMB = append(configSMB, "store dos attributes = no")
	}
	if config.VetoFiles != nil && *config.VetoFiles != "" {
		configSMB = append(configSMB, "veto files = "+*config.VetoFiles)
	}
	if config.SMB2Leases == "y" {
		configSMB = append(configSMB, "smb2 leases = yes")
	} else {
		configSMB = append(configSMB, "smb2 leases = no")
	}
	configSMB = append(configSMB, "log level = "+config.LogLevel)
	configSMB = append(configSMB, fmt.Sprintf("max log size = %d", config.MaxLogSize))
	configSMB = append(configSMB, "log file = /var/log/pspace/hydra.smb.log.%m")
	if config.BindInterfacesOnly == "y" {
		configSMB = append(configSMB, "bind interfaces only = yes")
		if config.Interfaces != nil && *config.Interfaces != "" {
			configSMB = append(configSMB, "interfaces = "+strings.ReplaceAll(*config.Interfaces, ",", " "))
		}
	} else {
		configSMB = append(configSMB, "bind interfaces only = no")
	}

	configSMB = append(configSMB, "read raw = yes")
	configSMB = append(configSMB, "write raw = yes")
	configSMB = append(configSMB, "server signing = no")
	configSMB = append(configSMB, "socket options = TCP_NODELAY IPTOS_LOWDELAY")
	configSMB = append(configSMB, "load printers = no")

	configSMB = append(configSMB, "fruit:nfs_aces = no")
	configSMB = append(configSMB, "fruit:veto_appledouble = no")
	configSMB = append(configSMB, "fruit:aapl = yes")
	configSMB = append(configSMB, "fruit:encoding = native")
	configSMB = append(configSMB, "fruit:locking = none")
	configSMB = append(configSMB, "fruit:metadata = stream")
	configSMB = append(configSMB, "fruit:resource = xattr")

	// get list of shares from database
	var shares []Share
	err = conn.Select(&shares, "SELECT * FROM SMB_SHARES")

	if err != nil {
		fmt.Println("Error getting SMB shares:" + err.Error())
		return
	}

	configSMB = append(configSMB, "\n")

	for _, share := range shares {
		if share.Enable == "n" {
			continue
		}

		configSMB = append(configSMB, "["+share.ShareName+"]")

		// select poolrefid from zfilesystems where id = share.datasetrefid
		var poolRefId string
		err = conn.Get(&poolRefId, fmt.Sprintf("SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s'", share.DatasetRefId))

		if err != nil {
			return
		}

		// select pool name from pools where id = poolrefid
		var poolName string
		err = conn.Get(&poolName, fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", poolRefId))

		if err != nil {
			return
		}

		// select dataset name from datasets where id = share.datasetrefid
		var datasetName string
		err = conn.Get(&datasetName, fmt.Sprintf("SELECT Name FROM ZFILESYSTEMS WHERE Id = '%s'", share.DatasetRefId))

		if err != nil {
			return
		}

		configSMB = append(configSMB, "path = /"+poolName+"/"+datasetName)

		if share.Browsable == "y" {
			configSMB = append(configSMB, "browseable = yes")
		} else {
			configSMB = append(configSMB, "browseable = no")
		}

		if share.Writable == "y" {
			configSMB = append(configSMB, "writable = yes")
		} else {
			configSMB = append(configSMB, "writable = no")
		}

		if share.GuestAccess == "y" {
			configSMB = append(configSMB, "guest ok = yes")
		} else {
			configSMB = append(configSMB, "guest ok = no")
		}

		if share.CaseSensitive == "y" {
			configSMB = append(configSMB, "case sensitive = yes")
		} else if share.CaseSensitive == "n" {
			configSMB = append(configSMB, "case sensitive = no")
		} else {
			configSMB = append(configSMB, "case sensitive = auto")
		}

		if share.Oplock == "y" {
			configSMB = append(configSMB, "oplocks = yes")
		} else {
			configSMB = append(configSMB, "oplocks = no")
		}

		// if share.Level2Oplock == "y" {
		// 	configSMB = append(configSMB, "level2 oplocks = yes")
		// } else {
		// 	configSMB = append(configSMB, "level2 oplocks = no")
		// }

		if share.KernelShareModes == "y" {
			configSMB = append(configSMB, "kernel share modes = yes")
		} else {
			configSMB = append(configSMB, "kernel share modes = no")
		}

		if share.PosixLocking == "y" {
			configSMB = append(configSMB, "posix locking = yes")
		} else {
			configSMB = append(configSMB, "posix locking = no")
		}

		if share.DeleteVetoFiles == "y" {
			configSMB = append(configSMB, "delete veto files = yes")
		} else {
			configSMB = append(configSMB, "delete veto files = no")
		}

		if share.VetoFiles != nil && *share.VetoFiles != "" {
			configSMB = append(configSMB, "veto files = "+*share.VetoFiles)
		}

		if share.GuestAccess != "y" {
			validUsers := []string{}
			readUserList := []string{}

			// select userrefid from smb_user_map where shareid = share.id
			var userRefIds []string
			err = conn.Select(&userRefIds, fmt.Sprintf("SELECT UserRefId FROM SMB_USER_MAP WHERE ShareRefId = '%s'", share.Id))

			if err != nil {
				fmt.Println("Error getting SMB share users:" + err.Error())
				return
			}

			// select userrefid from smb_user_map where shareid = share.id and permission = "r"
			var userRefIdsRead []string
			err = conn.Select(&userRefIdsRead, fmt.Sprintf("SELECT UserRefId FROM SMB_USER_MAP WHERE ShareRefId = '%s' AND Permission = 'r'", share.Id))

			if err != nil {
				fmt.Println("Error getting SMB share users2:" + err.Error())
				return
			}

			for _, userRefId := range userRefIds {
				// select username from users where id = userrefid
				var userName string
				err = conn.Get(&userName, fmt.Sprintf("SELECT UserId FROM USERS WHERE Id = '%s'", userRefId))

				if err != nil {
					fmt.Println("Error getting SMB share users3:" + err.Error())
					return
				}

				validUsers = append(validUsers, userName)
			}

			for _, userRefId := range userRefIdsRead {
				// select username from users where id = userrefid
				var userName string
				err = conn.Get(&userName, fmt.Sprintf("SELECT UserId FROM USERS WHERE Id = '%s'", userRefId))

				if err != nil {
					fmt.Println("Error getting SMB share users4:" + err.Error())
					return
				}

				readUserList = append(readUserList, userName)
			}

			validGroups := []string{}
			readGroupList := []string{}

			// select grouprefid from smb_group_map where shareid = share.id
			var groupRefIds []string
			err = conn.Select(&groupRefIds, fmt.Sprintf("SELECT GroupRefId FROM SMB_GROUP_MAP WHERE ShareRefId = '%s'", share.Id))

			if err != nil {
				fmt.Println("Error getting SMB share groups:" + err.Error())
				return
			}

			// select grouprefid from smb_group_map where shareid = share.id and permission = "r"
			var groupRefIdsRead []string
			err = conn.Select(&groupRefIdsRead, fmt.Sprintf("SELECT GroupRefId FROM SMB_GROUP_MAP WHERE ShareRefId = '%s' AND Permission = 'r'", share.Id))

			for _, groupRefId := range groupRefIds {
				// select groupname from groups where id = grouprefid
				var groupName string
				err = conn.Get(&groupName, fmt.Sprintf("SELECT GroupId FROM GROUPS WHERE Id = '%s'", groupRefId))

				if err != nil {
					fmt.Println("Error getting SMB share groups2:" + err.Error())
					return
				}

				validGroups = append(validGroups, "@"+groupName)
			}

			for _, groupRefId := range groupRefIdsRead {
				// select groupname from groups where id = grouprefid
				var groupName string
				err = conn.Get(&groupName, fmt.Sprintf("SELECT GroupId FROM GROUPS WHERE Id = '%s'", groupRefId))

				if err != nil {
					fmt.Println("Error getting SMB share groups3:" + err.Error())
					return
				}

				readGroupList = append(readGroupList, "@"+groupName)
			}

			// append valid users
			validUsers = append(validUsers, validGroups...)

			// append read users
			readUserList = append(readUserList, readGroupList...)

			if len(validUsers) > 0 {
				configSMB = append(configSMB, "valid users = \""+strings.Join(validUsers, "\" \"")+"\"")
			}

			if len(readUserList) > 0 && share.Writable == "y" {
				configSMB = append(configSMB, "read list = \""+strings.Join(readUserList, "\" \"")+"\"")
			}
		}

		if share.Comment != nil && *share.Comment != "" {
			configSMB = append(configSMB, "comment = "+*share.Comment)
		}

		configSMB = append(configSMB, "force create mode = 0777")
		configSMB = append(configSMB, "force directory mode = 0777")

		vfsObject := "vfs objects = "
		if share.MacSupport == "y" {
			vfsObject += "fruit streams_xattr catia "
		}
		if share.WORM == "y" {
			vfsObject += "worm "
		}
		if share.MacSupport == "y" || share.WORM == "y" {
			configSMB = append(configSMB, vfsObject)
		}

		if share.WORM == "y" {
			configSMB = append(configSMB, fmt.Sprintf("worm:grace_period = %d", share.GracePeriod))
		}

		if share.NetworkAccessAllow != "" {
			hosts_allow := "hosts allow = " + share.NetworkAccessAllow
			if share.NetworkAccessAllowExcept != "" {
				hosts_allow = hosts_allow + " EXCEPT " + share.NetworkAccessAllowExcept
			}
			configSMB = append(configSMB, hosts_allow)
		}

		if share.NetworkAccessDeny != "" {
			hosts_deny := "hosts deny = " + share.NetworkAccessDeny
			if share.NetworkAccessDenyExcept != "" {
				hosts_deny = hosts_deny + " EXCEPT " + share.NetworkAccessDenyExcept
			}
			configSMB = append(configSMB, hosts_deny)
		}

		configSMB = append(configSMB, "\n")
	}

	fileString := strings.Join(configSMB, "\n")
	// fmt.Println(fileString)

	configFile, err := os.Create("/etc/samba/smb.conf")

	if err != nil {
		return
	}

	defer configFile.Close()

	_, err = configFile.WriteString(fileString)

	if err != nil {
		return
	}

	response := subprocess.Run("smbcontrol", "all", "reload-config")

	if response.StdErr != "" {
		return
	}
}

func mkDir(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		err := os.MkdirAll(dir, 0777)
		if err != nil {
			return err
		}
	}
	return nil
}

func getDatasetPath(datasetId string) (string, error) {
	var datasetName string
	err := conn.Get(&datasetName, fmt.Sprintf("SELECT Name FROM ZFILESYSTEMS WHERE Id = '%s'", datasetId))

	if err != nil {
		logger.Error(err.Error())
		return "", err
	}

	var poolName string
	err = conn.Get(&poolName, fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = (SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s')", datasetId))

	if err != nil {
		logger.Error(err.Error())
		return "", err
	}

	path := "/" + poolName + "/" + datasetName

	return path, nil
}

func updateNFSService() {
	// get global settings from db
	var nfsSettings NFSConf
	err := conn.Get(&nfsSettings, "SELECT * FROM NFS_GLOBAL_CONF ORDER BY UpdateDate DESC LIMIT 1")

	if err != nil {
		fmt.Println("Error getting NFS global settings:" + err.Error())
		return
	}

	// copy file /etc/nfs.conf to string[]
	file, err := os.Open("/etc/nfs.conf")

	if err != nil {
		fmt.Println("Error opening NFS config file:" + err.Error())
		return
	}

	defer file.Close()

	scanner := bufio.NewScanner(file)

	var configNFS []string

	for scanner.Scan() {
		configNFS = append(configNFS, scanner.Text())
	}

	if err := scanner.Err(); err != nil {
		fmt.Println("Error reading NFS config file:" + err.Error())
		return
	}

	nfsd := false

	// remove all letters from nfsSettings.MaximumNFSProtocol and convert to float
	maxNFSProtocol, err := strconv.ParseFloat(strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) {
			return -1
		}
		return r
	}, nfsSettings.MaximumNFSProtocol), 64)

	// update configNFS with nfsSettings
	for i, line := range configNFS {
		if strings.Contains(line, "[nfsd]") {
			nfsd = true
			continue
		}

		if nfsd {
			if strings.Contains(line, "threads=") {
				configNFS[i] = fmt.Sprintf("threads=%d", nfsSettings.ThreadCount)
			}

			if strings.Contains(line, "vers2=") {
				if maxNFSProtocol >= 2 {
					configNFS[i] = fmt.Sprintf("vers2=y")
				} else {
					configNFS[i] = fmt.Sprintf("vers2=n")
				}
			}

			if strings.Contains(line, "vers3=") {
				if maxNFSProtocol >= 3 {
					configNFS[i] = fmt.Sprintf("vers3=y")
				} else {
					configNFS[i] = fmt.Sprintf("vers3=n")
				}
			}

			if strings.Contains(line, "vers4=") {
				if maxNFSProtocol >= 4 {
					configNFS[i] = fmt.Sprintf("vers4=y")
				} else {
					configNFS[i] = fmt.Sprintf("vers4=n")
				}
			}

			if strings.Contains(line, "vers4.0=") {
				if maxNFSProtocol >= 4 {
					configNFS[i] = fmt.Sprintf("vers4.0=y")
				} else {
					configNFS[i] = fmt.Sprintf("vers4.0=n")
				}
			}

			if strings.Contains(line, "vers4.1=") {
				if maxNFSProtocol >= 4.1 {
					configNFS[i] = fmt.Sprintf("vers4.1=y")
				} else {
					configNFS[i] = fmt.Sprintf("vers4.1=n")
				}
			}

			if strings.Contains(line, "vers4.2=") {
				if maxNFSProtocol >= 4.2 {
					configNFS[i] = fmt.Sprintf("vers4.2=y")
				} else {
					configNFS[i] = fmt.Sprintf("vers4.2=n")
				}
			}
		}

		if strings.Contains(line, "[") && nfsd {
			break
		}
	}

	// write configNFS to file /etc/nfs.conf
	file, err = os.Create("/etc/nfs.conf")

	if err != nil {
		fmt.Println("Error creating NFS config file:" + err.Error())
		return
	}

	defer file.Close()

	_, err = file.WriteString(strings.Join(configNFS, "\n") + "\n")

	if err != nil {
		fmt.Println("Error writing NFS config file:" + err.Error())
		return
	}

	// restart nfs-server
	response := subprocess.Run("sudo", "systemctl", "restart", "nfs-server")

	if response.ExitCode != 0 {
		fmt.Println("Error restarting NFS service:" + response.StdErr)
		return
	}
}

func updateNFSExports() {
	// get global settings from db
	var nfsSettings NFSConf
	err := conn.Get(&nfsSettings, "SELECT * FROM NFS_GLOBAL_CONF ORDER BY UpdateDate DESC LIMIT 1")

	if err != nil {
		fmt.Println("Error getting NFS global settings:" + err.Error())
		return
	}

	var exports []Export
	err = conn.Select(&exports, "SELECT * FROM NFS_EXPORTS WHERE Enable = 'y'")

	if err != nil {
		fmt.Println("Error getting NFS exports:" + err.Error())
		return
	}

	var configNFS []string

	for _, export := range exports {
		path, err := getDatasetPath(export.DatasetRefId)

		if err != nil {
			fmt.Println("Error getting NFS share path:" + err.Error())
			return
		}

		datasetPath := path + "\t"

		// select permission from NFS_EXPORTS_PERMISSIONS where ExportRefId = share.id
		var permissions []NFSPermission
		err = conn.Select(&permissions, fmt.Sprintf("SELECT * FROM NFS_EXPORTS_PERMISSIONS WHERE ExportRefId = '%s'", export.Id))

		if err != nil {
			fmt.Println("Error getting NFS share permissions:" + err.Error())
			return
		}

		for _, permission := range permissions {
			config := datasetPath

			if permission.Enable == "n" {
				continue
			}

			if permission.Client != "" {
				config += permission.Client + "("
			}

			if permission.Privilege == "rw" || permission.Privilege == "ro" {
				config += permission.Privilege + ","
			} else if permission.Privilege == "noaccess" {
				config += permission.Privilege + ")"
				configNFS = append(configNFS, config)
				continue
			}

			if permission.Async == "y" {
				config += "async,"
			} else {
				config += "sync,"
			}

			config += "no_wdelay,"

			if permission.Crossmnt == "y" {
				config += "crossmnt,"
			}

			if permission.Insecure == "y" {
				config += "insecure,"
			}

			var ugidInfo []int
			if permission.Squash == "no_mapping" {
				config += "no_root_squash,"
				ugidInfo = append(ugidInfo, nfsSettings.AnonuidGuest, nfsSettings.AnongidGuest)
			} else if permission.Squash == "root_to_admin" {
				config += "root_squash,"
				ugidInfo = append(ugidInfo, nfsSettings.AnonuidRoot, nfsSettings.AnongidRoot)
			} else if permission.Squash == "root_to_guest" {
				config += "root_squash,"
				ugidInfo = append(ugidInfo, nfsSettings.AnonuidGuest, nfsSettings.AnongidGuest)
			} else if permission.Squash == "all_to_admin" {
				config += "root_squash,"
				ugidInfo = append(ugidInfo, nfsSettings.AnonuidRoot, nfsSettings.AnongidRoot)
			} else if permission.Squash == "all_to_guest" {
				config += "root_squash,"
				ugidInfo = append(ugidInfo, nfsSettings.AnonuidGuest, nfsSettings.AnongidGuest)
			}

			// config += "insecure_locks,sec=sys,anonuid=" + strconv.Itoa(ugidInfo[0]) + ",anongid=" + strconv.Itoa(ugidInfo[1]) + ")"
			config += "insecure_locks,anonuid=" + strconv.Itoa(ugidInfo[0]) + ",anongid=" + strconv.Itoa(ugidInfo[1]) + ")"

			configNFS = append(configNFS, config)
		}
	}

	fileString := strings.Join(configNFS, "\n")
	fileString += "\n"
	fmt.Println(fileString)

	configFile, err := os.Create("/etc/exports")

	if err != nil {
		return
	}

	defer configFile.Close()

	_, err = configFile.WriteString(fileString)

	if err != nil {
		return
	}

	response := subprocess.Run("exportfs", "-ra")

	if response.StdErr != "" {
		return
	}
}

func updateS3() error {
	// edit /usr/local/pspace/etc/s3gw.conf
	// 0. get global settings from db
	var s3Configuration S3Configuration
	err := conn.Get(&s3Configuration, "SELECT * FROM S3_CONF ORDER BY UpdateDate DESC LIMIT 1")

	if err != nil {
		return err
	}

	var datasetRef string
	if s3Configuration.DatasetRefId != nil {
		datasetRef = *s3Configuration.DatasetRefId
	} else {
		return errors.New("DatasetRefId is null")
	}
	// get dataset path
	datasetPath, err := getDatasetPath(datasetRef)

	if err != nil {
		return err
	}

	// find ip address by interface name
	var ipAddress string
	if *s3Configuration.InterfaceName == "" {
		ipAddress = "0.0.0.0"
	} else {
		interface_json, err := networkInterfaceInfo(*s3Configuration.InterfaceName)

		if err != nil {
			return err
		}

		ipAddress = interface_json.IP
	}

	// 1. cat /usr/local/pspace/etc/s3gw.conf
	response := subprocess.Run("cat", "/usr/local/pspace/etc/s3gw.conf")

	if response.ExitCode != 0 {
		return errors.New(response.StdErr)
	}

	lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")

	// 2. update ports and dataset path
	for i, line := range lines {
		if strings.Contains(line, "s3.endpoint") {
			lines[i] = fmt.Sprintf("s3.endpoint=http://%s:%d", ipAddress, s3Configuration.HttpPort)
			continue
		} else if strings.Contains(line, "s3.secure-endpoint") {
			lines[i] = fmt.Sprintf("s3.secure-endpoint=https://%s:%d", ipAddress, s3Configuration.HttpsPort)
			continue
		} else if strings.Contains(line, "filesystem.basedir") {
			lines[i] = fmt.Sprintf("filesystem.basedir=%s", datasetPath)
			continue
		} else if strings.Contains(line, "s3.jetty.max-threads") {
			lines[i] = fmt.Sprintf("s3.jetty.max-threads=%d", s3Configuration.MaxThreads)
			continue
		} else if strings.Contains(line, "s3.jetty.maxidletimeout") {
			lines[i] = fmt.Sprintf("s3.jetty.maxidletimeout=%d", s3Configuration.MaxIdleTimeout)
			continue
		} else if strings.Contains(line, "s3.max-file-size") {
			lines[i] = fmt.Sprintf("s3.max-file-size=%d", s3Configuration.MaxFileSize)
			continue
		} else if strings.Contains(line, "s3.maxtimeskew") {
			lines[i] = fmt.Sprintf("s3.maxtimeskew=%d", s3Configuration.MaxTimeSkew)
			continue
		}
	}

	// 3. rewrite /usr/local/pspace/etc/s3gw.conf
	configFile, err := os.Create("/usr/local/pspace/etc/s3gw.conf")

	if err != nil {
		return err
	}

	_, err = configFile.WriteString(strings.Join(lines, "\n"))

	if err != nil {
		return err
	}

	configFile.Close()

	// 4. systemctl restart s3gw
	response = subprocess.Run("sudo", "systemctl", "restart", "ifs-s3gw")

	if response.ExitCode != 0 {
		return errors.New(response.StdErr)
	}

	// if enable == "y" then enable s3gw
	if s3Configuration.Enable == "y" {
		// 5. systemctl enable s3gw
		response = subprocess.Run("sudo", "systemctl", "start", "ifs-s3gw")

		if response.ExitCode != 0 {
			return errors.New(response.StdErr)
		}
	} else {
		// 5. systemctl disable s3gw
		response = subprocess.Run("sudo", "systemctl", "stop", "ifs-s3gw")

		if response.ExitCode != 0 {
			return errors.New(response.StdErr)
		}
	}

	return nil
}
