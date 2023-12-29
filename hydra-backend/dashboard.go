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
	"net/http"
	"strconv"
	"strings"

	"gopkg.in/pygz/subprocess.v1"
)

func uptimeString(status string) string {
	// Active: active (running) since Wed 2021-08-04 15:05:05 CST; 1 day 4h ago --> Up 1 day 4 hours
	uptime := strings.Split(status, "since ")[1]
	uptime = strings.Split(uptime, "; ")[1]
	uptime = strings.Split(uptime, " ago")[0]

	// Replace abbreviations with full words
	uptime = replaceTimeAbbreviations(uptime)

	uptime = "Up " + uptime

	return uptime
}

func replaceTimeAbbreviations(uptime string) string {
	replacements := map[string]string{
		"s":   "second",
		"m":   "minute",
		"min": "minute",
		"h":   "hour",
	}

	components := strings.Split(uptime, " ")
	for i, component := range components {
		if replacement, ok := replacements[component]; ok {
			components[i] = replacement
		} else if len(component) > 3 {
			lastThreeChars := component[len(component)-3:]
			if lastThreeChars == "min" {
				if value, err := strconv.Atoi(component[:len(component)-3]); err == nil {
					components[i] = strconv.Itoa(value) + " minutes"
				}
			}
		} else if len(component) > 1 {
			lastChar := component[len(component)-1]
			switch lastChar {
			case 'm':
				if value, err := strconv.Atoi(component[:len(component)-1]); err == nil {
					components[i] = strconv.Itoa(value) + " minutes"
				}
			case 'h':
				if value, err := strconv.Atoi(component[:len(component)-1]); err == nil {
					components[i] = strconv.Itoa(value) + " hours"
				}
			case 's':
				if value, err := strconv.Atoi(component[:len(component)-1]); err == nil {
					components[i] = strconv.Itoa(value) + " seconds"
				}
			}
		}
	}

	joinedResult := strings.Join(components, " ")

	parts := strings.Split(joinedResult, " ")
	for i := 1; i < len(parts); i += 2 {
		unit := parts[i]
		if parts[i-1] != "1" {
			unit += "s"
		}
		parts[i] = strings.TrimSuffix(unit, "s")
	}

	joinedResult = strings.Join(parts, " ")

	// Remove 0 values
	parts = strings.Split(joinedResult, " ")

	var result []string
	for i := 0; i < len(parts); i += 2 {
		if parts[i] != "0" {
			result = append(result, parts[i], parts[i+1])
		}
	}

	if len(result) > 2 {
		return strings.Join(result[:2], " ")
	} else {
		return strings.Join(result, " ")
	}
}

type SMBPanel struct {
	Active              bool   `json:"active"`
	Uptime              string `json:"uptime"`
	EnabledSharesNumber int    `json:"enabled_shares_number"`
	TotalSharesNumber   int    `json:"total_shares_number"`
}

// @Summary Get SMB Panel Info
// @Description Get SMB Panel Info
// @Tags dashboard
// @Accept  json
// @Produce  json
// @Success 200 {object} SMBPanel
// @Failure 500 {object} Response
// @Router /api/dashboard/hydrasmb [get]
func SMBPanelInfo(w http.ResponseWriter, r *http.Request) {
	smbPanel := SMBPanel{}

	// check if smb is active
	response := subprocess.Run("systemctl", "status", "smb.service")

	if response.ExitCode != 0 {
		smbPanel.Active = false
		smbPanel.Uptime = ""
	} else {
		lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
		for _, line := range lines {
			if strings.Contains(line, "Active:") {
				if strings.Contains(line, "active (running)") {
					smbPanel.Active = true
					// format uptime string
					if strings.Contains(line, "since ") || strings.Contains(line, "ago") {
						smbPanel.Uptime = uptimeString(line)
					}
				}
			}
		}
	}

	// count enabled shares from db
	query := "SELECT COUNT(*) FROM SMB_SHARES WHERE Enable = 'y'"
	err := conn.Get(&smbPanel.EnabledSharesNumber, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// count all shares from db
	query = "SELECT COUNT(*) FROM SMB_SHARES"
	err = conn.Get(&smbPanel.TotalSharesNumber, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, smbPanel)
}

type NFSPanel struct {
	Active               bool   `json:"active"`
	Uptime               string `json:"uptime"`
	EnabledExportsNumber int    `json:"enabled_exports_number"`
	TotalExportsNumber   int    `json:"total_exports_number"`
}

// @Summary Get NFS Panel Info
// @Description Get NFS Panel Info
// @Tags dashboard
// @Accept  json
// @Produce  json
// @Success 200 {object} NFSPanel
// @Failure 500 {object} Response
// @Router /api/dashboard/hydranfs [get]
func NFSPanelInfo(w http.ResponseWriter, r *http.Request) {
	nfsPanel := NFSPanel{}

	// check if nfs is active
	response := subprocess.Run("systemctl", "status", "nfs-server.service")

	if response.ExitCode != 0 {
		nfsPanel.Active = false
		nfsPanel.Uptime = ""
	} else {
		lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
		for _, line := range lines {
			if strings.Contains(line, "since ") {
				nfsPanel.Active = true
				nfsPanel.Uptime = uptimeString(line)
				break
			}
		}
	}

	// count enabled shares from db
	query := "SELECT COUNT(*) FROM NFS_EXPORTS WHERE Enable = 'y'"
	err := conn.Get(&nfsPanel.EnabledExportsNumber, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// count all shares from db
	query = "SELECT COUNT(*) FROM NFS_EXPORTS"
	err = conn.Get(&nfsPanel.TotalExportsNumber, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, nfsPanel)
}

type S3Panel struct {
	Active bool   `json:"active"`
	Uptime string `json:"uptime"`
}

// @Summary Get S3 Panel Info
// @Description Get S3 Panel Info
// @Tags dashboard
// @Accept  json
// @Produce  json
// @Success 200 {object} S3Panel
// @Failure 500 {object} Response
// @Router /api/dashboard/hydras3 [get]
func S3PanelInfo(w http.ResponseWriter, r *http.Request) {
	s3Panel := S3Panel{}

	response := subprocess.Run("systemctl", "status", "ifs-s3gw")

	if response.ExitCode != 0 {
		lines := strings.Split(strings.ReplaceAll(response.StdErr, "\r\n", "\n"), "\n")
		for _, line := range lines {
			if strings.Contains(line, "Active: ") {
				s3Panel.Active = false
				s3Panel.Uptime = ""
				break
			}
		}
	} else {
		lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
		for _, line := range lines {
			if strings.Contains(line, "Active: active (running)") {
				s3Panel.Active = true
				// format uptime string
				if strings.Contains(line, "since ") {
					s3Panel.Uptime = uptimeString(line)
				}
				break
			}
		}
	}

	format.JSON(w, http.StatusOK, s3Panel)
}
