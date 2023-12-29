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
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"

	"github.com/go-chi/chi"
	"gopkg.in/pygz/subprocess.v1"
)

// swagger:model
type ControlInterface struct {
	Interface string `json:"interface" example:"bond0"`
	Action    string `json:"action" example:"Activate"`
}

// @Summary Control interface
// @Description Activate / deactivate interface
// @Tags network
// @Accept  json
// @Produce  json
// @Param interface body ControlInterface true "Interface"
// @Success 200 {string} string "Interface controlled"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/network/interfaces/control [put]
func controlInterface(w http.ResponseWriter, r *http.Request) {
	body, err := ioutil.ReadAll(r.Body)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	var control ControlInterface
	json.Unmarshal([]byte(body), &control)

	RequestLog := fmt.Sprintf("[%s] %s requested to %s '%s'", LogProcessName, "admin", strings.ToLower(control.Action), control.Interface)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: control.Interface,
	}

	if control.Interface == "" {
		format.JSON(w, http.StatusBadRequest, "Interface name is required")
		return
	}

	if control.Action == "" {
		format.JSON(w, http.StatusBadRequest, "Action is required")
		return
	}

	if control.Action == "Activate" {
		response := subprocess.Run("nmcli", "con", "up", control.Interface)

		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.ActivateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
		SettingsNetworkLogMessage(LogPriority.Info, settingsNetworkLogMessageId.Activate, logVariables)

		format.JSON(w, http.StatusOK, "Interface activated")
	}

	if control.Action == "Deactivate" {
		response := subprocess.Run("nmcli", "con", "down", control.Interface)

		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.DeactivateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
		SettingsNetworkLogMessage(LogPriority.Info, settingsNetworkLogMessageId.Deactivate, logVariables)

		format.JSON(w, http.StatusOK, "Interface deactivated")
	}
}

// @Summary List servers
// @Description List servers
// @Tags syslog
// @Accept  json
// @Produce  json
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/syslog [get]
func listServers(w http.ResponseWriter, r *http.Request) {
	var servers []string

	err := connSys.Select(&servers, "SELECT DISTINCT FromHost FROM SystemEvents ORDER BY FromHost ASC")
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}

	format.JSON(w, http.StatusOK, servers)
}

// swagger:model
type NetworkInterface struct {
	Name    string `json:"name" example:"eth0"`
	IP      string `json:"ip" example:"192.168.13.201"`
	Type1   string `json:"type1" example:"Physical"`
	Type2   string `json:"type2" example:"Default"`
	Netmask string `json:"netmask" example:"24"`
	Speed   string `json:"speed" example:"1000 Mb/s"`
	Status  string `json:"status" example:"Active"`
	DHCP    string `json:"dhcp" example:"YES"`
	Gateway string `json:"gateway" example:"192.168.13.254"`
	MTU     string `json:"mtu" example:"1500"`
	MAC     string `json:"mac" example:"00:50:56:9c:2c:2c"`
	Duplex  string `json:"duplex" example:"Full"`
	// VLAN configuration
	VLANID     string `json:"vlanid" example:"10"`
	VLANParent string `json:"vlanparent" example:"eth0"`
	// Bond configuration
	BondOptions string `json:"bondoptions" example:"mode=active-backup,primary=ens161,primary_reselect=always"`
	// Slave configuration
	SlaveOf   string `json:"slaveof" example:"bond0"`
	SlaveType string `json:"slavetype" example:"bond"`
}

// @Summary Get network interfaces
// @Description Get information on all network interfaces
// @Tags network
// @Produce  json
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/network/interfaces [get]
func getNetworkInterfaces(w http.ResponseWriter, r *http.Request) {
	// @Param Authorization header string true "Insert your access token" default(Bearer <Add access token here>)
	response := subprocess.Run("nmcli", "con", "show")
	if response.ExitCode != 0 {
		format.JSON(w, http.StatusBadRequest, response.StdErr)
		return
	} else {
		var interfaces []NetworkInterface
		lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
		for index, line := range lines {
			line = strings.ReplaceAll(line, "\t\r\n", "")
			if index == 0 || line == "" { // skip header
				continue
			}
			values := strings.Split(line, " ")

			// if network is docker, skip
			if strings.Contains(values[0], "docker") {
				continue
			}

			// interface name
			interface_name_init := values[0]

			interface_json, err := networkInterfaceInfo(interface_name_init)
			if err != nil {
				format.JSON(w, http.StatusBadRequest, err.Error())
				return
			}

			interfaces = append(interfaces, *interface_json)
		}

		format.JSON(w, http.StatusOK, interfaces)
		return
	}
}

// @Summary Get network interface
// @Description Get information on a particular network interface
// @Tags network
// @Produce  json
// @Param interface path string true "interface name" default(ens161)
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/network/interfaces/{interface} [get]
func getNetworkInterface(w http.ResponseWriter, r *http.Request) {
	interface_name := chi.URLParam(r, "interface")
	if interface_name == "" {
		format.JSON(w, http.StatusBadRequest, "interface name is required")
		return
	}

	interface_json, err := networkInterfaceInfo(interface_name)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, interface_json)
}

// swagger:model
type PutNetworkInterface struct {
	DHCP    string `json:"dhcp" example:"NO"`
	IP      string `json:"ip" example:"192.168.13.201"`
	Netmask string `json:"netmask" example:"24"`
	Gateway string `json:"gateway" example:"192.168.13.254"`
}

// @Summary Put network interface
// @Description Edit a network interface
// @Tags network
// @Produce  json
// @Param interface path string true "interface name" default(ens161)
// @Param body body PutNetworkInterface true "interface name"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/network/interfaces/{interface} [put]
func updateNetworkInterface(w http.ResponseWriter, r *http.Request) {
	interface_name := chi.URLParam(r, "interface")
	if interface_name == "" {
		format.JSON(w, http.StatusBadRequest, "interface name is required")
		return
	}

	body, err := ioutil.ReadAll(r.Body)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	var interface_json PutNetworkInterface
	json.Unmarshal([]byte(body), &interface_json)

	RequestLog := fmt.Sprintf("[%s] %s requested to modify '%s'", LogProcessName, "admin", interface_name)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName:   interface_name,
		TargetValues: []string{interface_json.DHCP},
	}

	if interface_json.DHCP == "YES" {
		response := subprocess.Run("nmcli", "con", "mod", interface_name, "ipv4.method", "auto")
		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.UpdateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
		response = subprocess.Run("nmcli", "con", "up", interface_name)
		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.UpdateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	} else {
		fmt.Println("nmcli con mod " + interface_name + " ipv4.method manual ipv4.addresses " + interface_json.IP + "/" + interface_json.Netmask + " ipv4.gateway " + interface_json.Gateway)
		response := subprocess.Run("nmcli", "con", "mod", interface_name, "ipv4.method", "manual", "ipv4.addresses", interface_json.IP+"/"+interface_json.Netmask, "ipv4.gateway", interface_json.Gateway)
		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.UpdateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
		response = subprocess.Run("nmcli", "con", "up", interface_name)
		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.UpdateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}

	SettingsNetworkLogMessage(LogPriority.Info, settingsNetworkLogMessageId.Update, logVariables)

	format.JSON(w, http.StatusOK, "Updated network successfully")
}

// swagger:model
type NetworkInterfaceVLAN struct {
	Interface string `json:"interface" example:"ens102.10"`
	Parent    string `json:"parent" example:"ens102"`
	VlanID    string `json:"vlan_id" example:"10"`
	DHCP      string `json:"dhcp" example:"NO"`
	IP        string `json:"ip" example:"192.168.13.201"`
	Netmask   string `json:"netmask" example:"24"`
	Gateway   string `json:"gateway" example:"none"`
}

// @Summary Create VLAN
// @Description Create a VLAN
// @Tags vlan
// @Accept  json
// @Produce  json
// @Param body body NetworkInterfaceVLAN true "interface name"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/network/interfaces/vlan [post]
func createNetworkInterfaceVlan(w http.ResponseWriter, r *http.Request) {
	body, err := ioutil.ReadAll(r.Body)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	var interface_json NetworkInterfaceVLAN
	json.Unmarshal([]byte(body), &interface_json)

	RequestLog := fmt.Sprintf("[%s] %s requested to create VLAN interface '%s'", LogProcessName, "admin", interface_json.Interface)
	UIRequestLog(RequestLog)

	if interface_json.Parent == "" {
		format.JSON(w, http.StatusBadRequest, "parent interface is required")
		return
	}

	if interface_json.VlanID == "" {
		format.JSON(w, http.StatusBadRequest, "vlan id is required")
		return
	}

	var logVariables = LogVariables{
		ObjectName: interface_json.Interface,
	}

	if interface_json.DHCP == "YES" {
		response := subprocess.Run("nmcli", "con", "add", "type", "vlan", "con-name", interface_json.Interface, "ifname", interface_json.Interface,
			"dev", interface_json.Parent, "id", interface_json.VlanID, "ipv4.method", "auto", "ipv4.never-default", "yes", "connection.autoconnect", "no")
		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.VlanCreateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
		response = subprocess.Run("nmcli", "con", "up", interface_json.Interface)
		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.VlanCreateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}

		SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.VlanCreate, logVariables)
	} else {
		if interface_json.IP == "" {
			format.JSON(w, http.StatusBadRequest, "ip is required")
			return
		}

		if interface_json.Netmask == "" {
			format.JSON(w, http.StatusBadRequest, "netmask is required")
			return
		}

		response := subprocess.Run("nmcli", "con", "add", "type", "vlan", "con-name", interface_json.Interface, "ifname", interface_json.Interface,
			"dev", interface_json.Parent, "id", interface_json.VlanID, "ipv4.method", "manual", "ipv4.never-default", "yes", "connection.autoconnect", "no",
			"ipv4.address", interface_json.IP+"/"+interface_json.Netmask,
			"ipv4.gateway", interface_json.Gateway)
		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.VlanCreateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}

		SettingsNetworkLogMessage(LogPriority.Info, settingsNetworkLogMessageId.VlanCreate, logVariables)
	}
}

// @Summary Delete network interface
// @Description Delete a network interface
// @Tags vlan
// @Produce  json
// @Param interface path string true "interface name" default(ens102.10)
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/network/interfaces/vlan/{interface} [delete]
func deleteNetworkInterfaceVlan(w http.ResponseWriter, r *http.Request) {
	interface_name := chi.URLParam(r, "interface")

	if interface_name == "" {
		format.JSON(w, http.StatusBadRequest, "interface name is required")
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to delete VLAN interface '%s'", LogProcessName, "admin", interface_name)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: interface_name,
	}

	response := subprocess.Run("nmcli", "con", "delete", interface_name)
	if response.ExitCode != 0 {
		SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.VlanDeleteFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}
	SettingsNetworkLogMessage(LogPriority.Info, settingsNetworkLogMessageId.VlanDelete, logVariables)

	format.JSON(w, http.StatusOK, response.StdOut)
}

type BondInterface struct {
	SlaveInterfaces []string `json:"slave_interfaces" example:"ens161,ens224"`
	Interface       string   `json:"interface" example:"bond0"`
	BondType        string   `json:"bond_type" example:"active-backup"` // balance-rr, active-backup, balance-xor, broadcast, 802.3ad, balance-tlb, balance-alb
	BondPrimary     string   `json:"bond_primary" example:"ens161"`     // primary interface
	BondReselect    string   `json:"bond_reselect" example:"always"`    // always, better, failure
	DHCP            string   `json:"dhcp" example:"NO"`                 // YES, NO
	IP              string   `json:"ip" example:"10.10.10.202"`
	Netmask         string   `json:"netmask" example:"24"`
	Gateway         string   `json:"gateway" example:""`
}

// @Summary Create bond interface
// @Description Create bond interface
// @Tags bond
// @Accept  json
// @Produce  json
// @Param bond body BondInterface true "Bond interface"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/network/interfaces/bond [post]
func createBondInterface(w http.ResponseWriter, r *http.Request) {
	body, err := ioutil.ReadAll(r.Body)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	var bond BondInterface
	json.Unmarshal([]byte(body), &bond)

	RequestLog := fmt.Sprintf("[%s] %s requested to create BOND conntection '%s'", LogProcessName, "admin", bond.Interface)
	UIRequestLog(RequestLog)

	if bond.Interface == "" {
		format.JSON(w, http.StatusBadRequest, "Interface name is required")
		return
	}

	if bond.BondType == "" {
		format.JSON(w, http.StatusBadRequest, "Bond type is required")
		return
	}

	if bond.DHCP == "" {
		format.JSON(w, http.StatusBadRequest, "DHCP is required")
		return
	}

	if bond.DHCP == "NO" {
		if bond.IP == "" {
			format.JSON(w, http.StatusBadRequest, "IP is required")
			return
		}

		if bond.Netmask == "" {
			format.JSON(w, http.StatusBadRequest, "Netmask is required")
			return
		}
	}

	// delete existing connections
	for _, slave := range bond.SlaveInterfaces {
		response := subprocess.Run("nmcli", "con", "del", slave)

		if response.ExitCode != 0 {
			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}

	var logVariables = LogVariables{
		ObjectName:   bond.Interface,
		TargetValues: []string{strings.Join(bond.SlaveInterfaces, ", ")},
	}

	// create bond connection
	// dhcp == YES
	if bond.DHCP == "YES" {
		response := subprocess.Run("nmcli", "con", "add", "type", "bond", "con-name", bond.Interface, "ifname", bond.Interface, "bond.options",
			bond.BondType, "ipv4.method", "auto", "ipv4.never-default", "yes", "connection.autoconnect", "no")

		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.BondCreateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}
	// dhcp == NO
	if bond.DHCP == "NO" {
		response := subprocess.Run("nmcli", "con", "add", "type", "bond", "con-name", bond.Interface, "ifname", bond.Interface, "bond.options",
			"mode="+bond.BondType, "connection.autoconnect", "no", "ipv4.method", "manual", "ipv4.never-default",
			"yes", "ipv4.address", bond.IP+"/"+bond.Netmask, "ipv4.gateway", bond.Gateway)

		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.BondCreateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}

	// add bond options (if any)
	if bond.BondPrimary != "" && bond.BondReselect != "" {
		response := subprocess.Run("nmcli", "con", "mod", bond.Interface, "+bond.options", "primary="+bond.BondPrimary, "+bond.options", "primary_reselect="+bond.BondReselect)

		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.BondCreateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}

	// add slaves
	for _, slave := range bond.SlaveInterfaces {
		response := subprocess.Run("nmcli", "con", "add", "type", "bond-slave", "con-name", slave, "ifname", slave, "master", bond.Interface, "connection.autoconnect", "no")

		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.BondCreateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}

	// activate bond connection and slaves
	response := subprocess.Run("nmcli", "con", "up", bond.Interface)

	if response.ExitCode != 0 {
		SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.BondCreateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	for _, slave := range bond.SlaveInterfaces {
		response := subprocess.Run("nmcli", "con", "up", slave)

		if response.ExitCode != 0 {
			SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.BondCreateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}
	SettingsNetworkLogMessage(LogPriority.Info, settingsNetworkLogMessageId.BondCreate, logVariables)

	format.JSON(w, http.StatusOK, "Bond interface created")
}

// @Summary Delete bond interface
// @Description Delete bond interface
// @Tags bond
// @Accept  json
// @Produce  json
// @Param interface path string true "Bond interface name" default(bond0)
// @Success 200 {string} string "Bond interface deleted"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/network/interfaces/bond/{interface} [delete]
func deleteBondInterface(w http.ResponseWriter, r *http.Request) {
	interface_name := chi.URLParam(r, "interface")
	var all_interfaces []NetworkInterface

	RequestLog := fmt.Sprintf("[%s] %s requested to delete BOND connection '%s'", LogProcessName, "admin", interface_name)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: interface_name,
	}

	response := subprocess.Run("nmcli", "con", "show")
	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	} else {
		lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
		for index, line := range lines {
			line = strings.ReplaceAll(line, "\t\r\n", "")
			if index == 0 || line == "" { // skip header
				continue
			}
			values := strings.Split(line, " ")

			// if network is docker, skip
			if strings.Contains(values[0], "docker") {
				continue
			}

			// interface name
			interface_name_init := values[0]

			interface_json, err := networkInterfaceInfo(interface_name_init)
			if err != nil {
				format.JSON(w, http.StatusInternalServerError, err.Error())
				return
			}

			all_interfaces = append(all_interfaces, *interface_json)
		}
	}

	if interface_name == "" {
		format.JSON(w, http.StatusBadRequest, "Interface name is required")
		return
	}

	// delete and initialize slaves
	for _, slave := range all_interfaces {
		if slave.SlaveOf == interface_name {
			response := subprocess.Run("nmcli", "con", "del", slave.Name)

			if response.ExitCode != 0 {
				SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.BondDeleteFail, logVariables)

				format.JSON(w, http.StatusInternalServerError, response.StdErr)
				return
			}

			response = subprocess.Run("nmcli", "con", "add", "type", "ethernet", "con-name", slave.Name, "ifname", slave.Name,
				"ipv4.method", "auto", "ipv4.never-default", "yes", "connection.autoconnect", "no")

			if response.ExitCode != 0 {
				SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.BondDeleteFail, logVariables)

				format.JSON(w, http.StatusInternalServerError, response.StdErr)
				return
			}
		}
	}

	// delete bond connection
	response = subprocess.Run("nmcli", "con", "del", interface_name)

	if response.ExitCode != 0 {
		SettingsNetworkLogMessage(LogPriority.Error, settingsNetworkLogMessageId.BondDeleteFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	SettingsNetworkLogMessage(LogPriority.Info, settingsNetworkLogMessageId.BondDelete, logVariables)

	format.JSON(w, http.StatusOK, "Bond interface deleted")
}

// @Summary Check if interface name is taken
// @Description Check if interface name is taken
// @Tags network
// @Accept  json
// @Produce  json
// @Param interfaceName path string true "Interface name"
// @Success 200 {boolean} boolean "Interface name taken"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/network/interface-name-taken/{interfaceName} [get]
func interfaceNameTaken(w http.ResponseWriter, r *http.Request) {
	interfaceName := chi.URLParam(r, "interfaceName")

	// check if interface exists
	response := subprocess.Run("nmcli", "con", "show", interfaceName)
	if response.ExitCode != 0 {
		format.JSON(w, http.StatusOK, false)
		return
	} else {
		format.JSON(w, http.StatusOK, true)
		return
	}
}
