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
	"time"

	"gopkg.in/pygz/subprocess.v1"
)

// @Summary Change hostname
// @Description Change hostname
// @Tags hostname
// @Accept  json
// @Produce  json
// @Param Body body Hostname true "new hostname"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/change-hostname [post]
func changeHostname(w http.ResponseWriter, r *http.Request) {
	body, err_body := ioutil.ReadAll(r.Body)

	if err_body != nil {
		format.Text(w, 500, err_body.Error())
		return
	}

	var hostname Hostname
	json.Unmarshal([]byte(body), &hostname)

	RequestLog := fmt.Sprintf("[%s] %s requested to change hostname to '%s'", LogProcessName, "admin", hostname.Hostname)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: hostname.Hostname,
	}

	response := subprocess.Run("hostnamectl", "set-hostname", hostname.Hostname)
	if response.ExitCode != 0 {
		SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.HostnameChangeFail, logVariables)

		format.JSON(w, http.StatusBadRequest, response.StdErr)
		return
	} else {
		SettingsSystemLogMessage(LogPriority.Info, settingsSystemLogMessageId.HostnameChange, logVariables)

		format.JSON(w, http.StatusOK, response.StdOut)
		return
	}
}

// @Summary Get hostname
// @Description Get hostname
// @Tags hostname
// @Produce  json
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/get-hostname [get]
func getHostname(w http.ResponseWriter, r *http.Request) {
	response := subprocess.Run("hostname")
	if response.ExitCode != 0 {
		format.JSON(w, http.StatusBadRequest, response.StdErr)
		return
	} else {
		hostname := strings.ReplaceAll(response.StdOut, "\n", "")
		var hostname_json Hostname = Hostname{Hostname: hostname}
		format.JSON(w, http.StatusOK, hostname_json)
		return
	}
}

// swagger:model
type TimeData struct {
	LocalTime     string `json:"local_time" example:"2023-03-15 16:01:56"`
	TimeZone      string `json:"time_zone" example:"Asia/Seoul"`
	NTPService    string `json:"ntp_service" example:"y"`
	NTPServerList string `json:"ntp_server_list" example:"0.asia.pool.ntp.org 1.asia.pool.ntp.org 2.asia.pool.ntp.org 3.asia.pool.ntp.org"`
}

// @Summary Get time
// @Description Get time
// @Tags time
// @Produce  json
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/system/time [get]
func getTime(w http.ResponseWriter, r *http.Request) {
	response := subprocess.Run("timedatectl")
	if response.ExitCode != 0 {
		format.JSON(w, http.StatusBadRequest, response.StdErr)
		return
	} else {
		var time TimeData
		for _, line := range strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n") {
			if strings.Contains(line, "Local time") {
				localtime := strings.Split(line, "Local time: ")[1]
				time.LocalTime = strings.ReplaceAll(localtime, "  ", "")
			} else if strings.Contains(line, "Time zone") {
				timezone := strings.Split(strings.ReplaceAll(line, "Time zone: ", ""), " (")[0]
				time.TimeZone = strings.ReplaceAll(timezone, " ", "")
			} else if strings.Contains(line, "NTP service") {
				ntpservice := strings.ReplaceAll(line, "NTP service: ", "")
				time.NTPService = strings.ReplaceAll(ntpservice, " ", "")
			}
		}

		response_ntplist := subprocess.Run("cat", "/etc/chrony.conf")
		if response_ntplist.ExitCode != 0 {
			format.JSON(w, http.StatusBadRequest, response_ntplist.StdErr)
			return
		} else {
			var ntplist []string
			for _, line := range strings.Split(strings.ReplaceAll(response_ntplist.StdOut, "\r\n", "\n"), "\n") {
				if strings.HasPrefix(line, "pool") {
					ntplist = append(ntplist, line)
				} else if strings.HasPrefix(line, "server") {
					ntplist = append(ntplist, strings.Split(line, " ")[1])
				}
			}

			time.NTPServerList = strings.Join(ntplist, ", ")
		}
		format.JSON(w, http.StatusOK, time)
		return
	}
}

// @Summary Change time
// @Description Change time
// @Tags time
// @Accept  json
// @Produce  json
// @Param Body body TimeData true "new time"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/system/time [put]
func setTime(w http.ResponseWriter, r *http.Request) {
	body, err_body := ioutil.ReadAll(r.Body)

	if err_body != nil {
		format.Text(w, 500, err_body.Error())
		return
	}

	var time TimeData
	json.Unmarshal([]byte(body), &time)

	RequestLog := fmt.Sprintf("[%s] %s requested to change datetime settings", LogProcessName, "admin")
	UIRequestLog(RequestLog)

	var file []string
	if time.NTPService == "y" {
		var logVariables = LogVariables{
			TargetValues: []string{time.TimeZone},
		}

		// change time zone
		response := subprocess.Run("timedatectl", "set-timezone", time.TimeZone)
		if response.ExitCode != 0 {
			SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.TimeDateChangeNTPFail, logVariables)

			format.JSON(w, http.StatusBadRequest, response.StdErr)
			return
		}

		// edit /etc/chrony.conf
		ntp_server_list := strings.Split(time.NTPServerList, ", ")

		response_ntplist := subprocess.Run("cat", "/etc/chrony.conf")
		if response_ntplist.ExitCode != 0 {
			SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.TimeDateChangeNTPFail, logVariables)

			format.JSON(w, http.StatusBadRequest, response_ntplist.StdErr)
			return
		} else {
			for _, line := range strings.Split(strings.ReplaceAll(response_ntplist.StdOut, "\r\n", "\n"), "\n") {
				if strings.HasPrefix(line, "pool") {
					continue
				}
				if strings.HasPrefix(line, "server") {
					continue
				}
				file = append(file, line)
			}
		}

		for index, _ := range file {
			if index == 2 {
				for _index, line_server := range ntp_server_list {
					if strings.HasPrefix(line_server, "pool") {
						file = append(file[:index+_index], append([]string{line_server}, file[index+_index:]...)...)
					} else {
						file = append(file[:index+_index], append([]string{"server " + line_server}, file[index+_index:]...)...)
					}
				}
			}
		}

		// write /etc/chrony.conf
		err := ioutil.WriteFile("/etc/chrony.conf", []byte(strings.Join(file, "\n")), 0644)
		if err != nil {
			SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.TimeDateChangeNTPFail, logVariables)

			format.JSON(w, http.StatusBadRequest, err.Error())
			return
		}

		// restart ntp service
		response_restart := subprocess.Run("timedatectl", "set-ntp", "n")
		if response_restart.ExitCode != 0 {
			SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.TimeDateChangeNTPFail, logVariables)

			format.JSON(w, http.StatusBadRequest, response_restart.StdErr)
			return
		}
		response_restart = subprocess.Run("timedatectl", "set-ntp", "y")
		if response_restart.ExitCode != 0 {
			SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.TimeDateChangeNTPFail, logVariables)

			format.JSON(w, http.StatusBadRequest, response_restart.StdErr)
			return
		}

		SettingsSystemLogMessage(LogPriority.Info, settingsSystemLogMessageId.TimeDateChangeNTP, logVariables)

		format.JSON(w, http.StatusOK, "NTP Service has been restarted")

	} else if time.NTPService == "n" {
		var logVariables = LogVariables{
			TargetValues: []string{time.LocalTime, time.TimeZone},
		}

		// turn off ntp service
		response := subprocess.Run("timedatectl", "set-ntp", "n")
		if response.ExitCode != 0 {
			SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.TimeDateChangeManualFail, logVariables)

			format.JSON(w, http.StatusBadRequest, response.StdErr)
			return
		}

		// change time
		response = subprocess.Run("timedatectl", "set-time", time.LocalTime)
		if response.ExitCode != 0 {
			SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.TimeDateChangeManualFail, logVariables)

			format.JSON(w, http.StatusBadRequest, response.StdErr)
			return
		}

		// change time zone
		response = subprocess.Run("timedatectl", "set-timezone", time.TimeZone)
		if response.ExitCode != 0 {
			SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.TimeDateChangeManualFail, logVariables)

			format.JSON(w, http.StatusBadRequest, response.StdErr)
			return
		}

		SettingsSystemLogMessage(LogPriority.Info, settingsSystemLogMessageId.TimeDateChangeManual, logVariables)

		format.JSON(w, http.StatusOK, "NTP Service has been turned off")
	} else {
		format.JSON(w, http.StatusBadRequest, "Invalid NTP Service")
		return
	}
}

// @Summary Reset chrony
// @Description Reset chrony
// @Tags time
// @Accept  json
// @Produce  json
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/system/time/reset [post]
func resetChrony(w http.ResponseWriter, r *http.Request) {
	response := subprocess.Run("systemctl", "restart", "chronyd.service")

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusBadRequest, response.StdErr)
		return
	}

	format.JSON(w, http.StatusOK, "Chrony has been restarted")
}

// @Summary Get timezones
// @Description Get timezones
// @Tags time
// @Accept  json
// @Produce  json
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/system/time/timezones [get]
func getTimeZones(w http.ResponseWriter, r *http.Request) {
	var timezones []string
	response := subprocess.Run("timedatectl", "list-timezones")
	if response.ExitCode != 0 {
		format.JSON(w, http.StatusBadRequest, response.StdErr)
		return
	} else {
		for _, line := range strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n") {
			timezones = append(timezones, line)
		}
	}
	format.JSON(w, http.StatusOK, timezones)
}

//swagger:model
type ManagementInterface struct {
	Interfaces          []string `json:"interfaces"`
	ManagementInterface string   `json:"management_interface"`
	IPAddress           string   `json:"ip_address"`
	Netmask             string   `json:"netmask"`
	Gateway             string   `json:"gateway"`
	DNSList             []string `json:"dns_list"`
}

type ManagementInterfaceDB struct {
	Id            string `json:"id" db:"Id"`
	InterfaceName string `json:"interface_name" db:"InterfaceName"`
	IPAddress     string `json:"ip_address" db:"IPAddress"`
	Netmask       string `json:"netmask" db:"Netmask"`
	Gateway       string `json:"gateway" db:"Gateway"`
	DNS1          string `json:"dns1" db:"DNS1"`
	DNS2          string `json:"dns2" db:"DNS2"`
}

// @Summary Get DNS servers
// @Description Get DNS servers
// @Tags network
// @Produce  json
// @Success 200 {array} string "DNS servers"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/network/dns [get]
func getDNS(w http.ResponseWriter, r *http.Request) {
	// check if there is an entry in the database
	management_interface_db := ManagementInterfaceDB{}

	query := "SELECT * FROM SYSTEM_MNG_NET_INTERFACE LIMIT 1"
	db_err := conn.Get(&management_interface_db, query)

	// initialize management interface
	management_interface := ManagementInterface{}

	// get all connections
	response := subprocess.Run("nmcli", "con", "show")
	if response.ExitCode != 0 {
		format.JSON(w, http.StatusBadRequest, response.StdErr)
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
				format.JSON(w, http.StatusBadRequest, err.Error())
				return
			}

			if interface_json.SlaveOf == "--" {
				management_interface.Interfaces = append(management_interface.Interfaces, interface_json.Name)
			}

			// if there is no entry in the database, get the management interface from the network interface
			if interface_json.Type2 == "Management" {
				if db_err != nil {
					management_interface.ManagementInterface = interface_json.Name
					management_interface.IPAddress = interface_json.IP
					management_interface.Netmask = interface_json.Netmask
					management_interface.Gateway = interface_json.Gateway
				}
			}
		}
	}

	// if there is an entry in the database, get the management interface from the database
	if db_err == nil {
		fmt.Println("management_interface_db", management_interface_db)
		management_interface.ManagementInterface = management_interface_db.InterfaceName
		management_interface.IPAddress = management_interface_db.IPAddress
		management_interface.Netmask = management_interface_db.Netmask
		management_interface.Gateway = management_interface_db.Gateway
		management_interface.DNSList = append(management_interface.DNSList, management_interface_db.DNS1)
		management_interface.DNSList = append(management_interface.DNSList, management_interface_db.DNS2)
	} else {
		response = subprocess.Run("cat", "/run/NetworkManager/resolv.conf")
		if response.ExitCode != 0 {
			format.JSON(w, http.StatusBadRequest, response.StdErr)
			return
		} else {
			lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
			for _, line := range lines {
				if strings.Contains(line, "nameserver") {
					management_interface.DNSList = append(management_interface.DNSList, strings.Split(line, " ")[1])
				}
			}
		}
	}

	format.JSON(w, http.StatusOK, management_interface)
}

// swagger:model
type ManagementInterfaceUpdate struct {
	TargetInterface          string   `json:"target_interface" example:"ens161"`
	PreviousInterface        *string  `json:"previous_interface,omitempty" example:"ens192"`
	PreviousInterfaceGateway *string  `json:"previous_interface_gateway,omitempty" example:"192.168.13.254"`
	DNSList                  []string `json:"dns_list" example:"8.8.8.8, 8.8.4.4"`
}

// @Summary Set management interface
// @Description Set management interface
// @Tags network
// @Accept  json
// @Produce  json
// @Param management_interface body ManagementInterfaceUpdate true "Management interface"
// @Success 200 {string} string "Management interface set"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/network/management-interface [put]
func setManagementInterface(w http.ResponseWriter, r *http.Request) {
	var management_interface ManagementInterfaceUpdate
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&management_interface); err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to change management interface to %s", LogProcessName, "admin", management_interface.TargetInterface)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: management_interface.TargetInterface,
	}

	// change previous interface
	if management_interface.PreviousInterface != nil {
		// modify previous interface
		response := subprocess.Run("nmcli", "con", "mod", *management_interface.PreviousInterface, "ipv4.never-default", "yes")
		if response.ExitCode != 0 {
			SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.ManagementInterfaceChangeFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}

		if management_interface.PreviousInterfaceGateway != nil {
			response := subprocess.Run("nmcli", "con", "mod", *management_interface.PreviousInterface, "ipv4.dns", "\"\"", "ipv4.gateway", *management_interface.PreviousInterfaceGateway)
			if response.ExitCode != 0 {
				SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.ManagementInterfaceChangeFail, logVariables)

				format.JSON(w, http.StatusInternalServerError, response.StdErr)
				return
			}
		}
	}

	command := fmt.Sprintf("nmcli con mod %s ipv4.never-default no ipv4.dns \"%s\"", management_interface.TargetInterface, strings.Join(management_interface.DNSList, ","))

	// target interface setting
	response := subprocess.Run("sh", "-c", command)

	if response.ExitCode != 0 {
		SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.ManagementInterfaceChangeFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	// restart target connection
	response = subprocess.Run("nmcli", "con", "up", management_interface.TargetInterface)
	if response.ExitCode != 0 {
		SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.ManagementInterfaceChangeFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	if management_interface.PreviousInterface != nil {
		// restart previous connection
		response := subprocess.Run("nmcli", "con", "up", *management_interface.PreviousInterface)
		if response.ExitCode != 0 {
			SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.ManagementInterfaceChangeFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}

	// get ip address, netmask, gateway from target interface
	interface_json, err := networkInterfaceInfo(management_interface.TargetInterface)

	if err != nil {
		SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.ManagementInterfaceChangeFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// check if there is an entry in the database
	management_interface_db := ManagementInterfaceDB{}
	query := "SELECT * FROM SYSTEM_MNG_NET_INTERFACE LIMIT 1"
	db_err := conn.Get(&management_interface_db, query)

	if db_err != nil {
		// insert management interface
		query := fmt.Sprintf("INSERT INTO SYSTEM_MNG_NET_INTERFACE (InterfaceName, IPAddress, Netmask, Gateway, DNS1, DNS2) VALUES ('%s', '%s', '%s', '%s', '%s', '%s')", management_interface.TargetInterface, interface_json.IP, interface_json.Netmask, interface_json.Gateway, management_interface.DNSList[0], management_interface.DNSList[1])
		_, err := conn.Exec(query)

		if err != nil {
			SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.ManagementInterfaceChangeFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, db_err.Error())
			return
		}
	} else {
		// update management interface
		query := fmt.Sprintf("UPDATE SYSTEM_MNG_NET_INTERFACE SET InterfaceName='%s', IPAddress='%s', Netmask='%s', Gateway='%s', DNS1='%s', DNS2='%s' WHERE Id = '%s'", management_interface.TargetInterface, interface_json.IP, interface_json.Netmask, interface_json.Gateway, management_interface.DNSList[0], management_interface.DNSList[1], management_interface_db.Id)
		_, err := conn.Exec(query)

		if err != nil {
			SettingsSystemLogMessage(LogPriority.Error, settingsSystemLogMessageId.ManagementInterfaceChangeFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, db_err.Error())
			return
		}
	}

	SettingsSystemLogMessage(LogPriority.Info, settingsSystemLogMessageId.ManagementInterfaceChange, logVariables)

	format.JSON(w, http.StatusOK, "Management interface changed")
}

// @Summary Get log configuration
// @Description Get log configuration
// @Tags system
// @Produce  json
// @Success 200 {object} LogConfig "Log configuration"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/system/log-configuration [get]
func getLogConfiguration(w http.ResponseWriter, r *http.Request) {
	logConfiguration := LogConfig{}

	// get log configuration from database
	query := "SELECT * FROM SYSTEM_CONF_LOG ORDER BY UpdateDate DESC LIMIT 1"
	err := conn.Get(&logConfiguration, query)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, logConfiguration)
}

type LogConfigPost struct {
	LogLevel int `json:"log_level" example:"3"`
}

// @Summary Set log configuration
// @Description Set log configuration
// @Tags system
// @Accept  json
// @Produce  json
// @Param log_configuration body LogConfigPost true "Log configuration"
// @Success 200 {string} string "Log configuration set"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/system/log-configuration [put]
func setLogConfiguration(w http.ResponseWriter, r *http.Request) {
	var logConfiguration LogConfigPost
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&logConfiguration); err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	UIRequestLog(fmt.Sprintf("[%s] %s requested to set new log configuration", LogProcessName, "admin"))

	// set log configuration in database
	query := fmt.Sprintf("INSERT INTO SYSTEM_CONF_LOG (ProcessName, Facility, LogLevel, UpdateDate) VALUES ('%s', '%s', %d, '%s')", LogProcessName, "DAEMON", logConfiguration.LogLevel, time.Now().Format("2006-01-02 15:04:05"))
	_, err := conn.Exec(query)

	if err != nil {
		LogChangeLogMessage(LogPriority.Error, "failed to set new log configuration; priority: %s", logConfiguration.LogLevel)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	LogChangeLogMessage(LogPriority.Info, "successfully set new log configuration; priority: %s", logConfiguration.LogLevel)

	format.JSON(w, http.StatusOK, "Log configuration set")
}

// @Summary Get Grafana IP
// @Description Get Grafana IP
// @Tags system
// @Produce  json
// @Success 200 {string} string "Grafana IP"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/system/grafana-ip [get]
func getGrafanaIP(w http.ResponseWriter, r *http.Request) {
	var grafanaIP *string

	// get grafana ip from database
	query := "SELECT GrafanaIP FROM ADMIN_LOGIN_INFO LIMIT 1"
	err := conn.Get(&grafanaIP, query)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, grafanaIP)
}
