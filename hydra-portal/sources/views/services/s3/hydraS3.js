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
import { JetView } from "webix-jet";
import { ajaxFail } from "../../../functions/ajaxFail";

var poolInformation
var datasetInformation

var existingConfig = false
export default class HydraS3 extends JetView {
	config() {
		var domain = "0.0.0.0"

		const labelWidth = 250
		const width = 600

		return {
			id: "hydraS3",
			borderless: true,
			rows: [
				{ height: 15 },
				{
					paddingX: 15,
					borderless: true,
					rows: [
						{
							view: "form",
							id: "s3_form",
							elements:
								[
									{
										cols: [
											{
												rows: [
													{
														view: "switch", id: "S3EnableSwitch", label: "Enable S3-Compatible Service", labelWidth: labelWidth, value: 0, on: {
															onChange: function (newv, oldv) {
																// if pool and dataset are not null, enable the button
																if ($$("S3StoragePools").getValue() == "" || $$("S3Dataset").getValue() != "") {
																	return false
																}
															}
														}
													},
													{
														view: "label", label: "S3 Service Endpoint", labelWidth: labelWidth,
													},
													{
														padding: {
															left: 15, right: 0, top: 0, bottom: 0
														},
														rows: [
															{
																view: "richselect", id: "S3NetworkInterfaces", label: "Network Interface", labelWidth: labelWidth - 15, inputWidth: width - 15, on: {
																	onChange: function (newv, oldv) {
																		if (newv == "Allow All Interfaces") {
																			domain = "0.0.0.0"

																			// if ports are not null, set the endpoint
																			if ($$("S3HttpPort").getValue() != "") {
																				$$("S3HttpEndpoint").setValue(domain + ":" + $$("S3HttpPort").getValue())
																			}

																			if ($$("S3HttpsPort").getValue() != "") {
																				$$("S3HttpsEndpoint").setValue(domain + ":" + $$("S3HttpsPort").getValue())
																			}
																		} else {
																			webix.ajax().get("/api/network/interfaces/" + newv).then(function (data) {
																				var result = data.json()
																				domain = result.ip

																				// if ports are not null, set the endpoint
																				if ($$("S3HttpPort").getValue() != "") {
																					$$("S3HttpEndpoint").setValue(domain + ":" + $$("S3HttpPort").getValue())
																				}

																				if ($$("S3HttpsPort").getValue() != "") {
																					$$("S3HttpsEndpoint").setValue(domain + ":" + $$("S3HttpsPort").getValue())
																				}
																			})
																		}
																	}
																}
															},
															{ height: 15 },
															{
																view: "text", id: "S3HttpPort", label: "HTTP Port", labelWidth: labelWidth - 15, inputWidth: width - 15, on: {
																	onKeyPress: function (code, e) {
																		if (code < 48 || code > 57) {
																			if (code == 8 || code == 9 || code == 13 || code == 46 || (code >= 37 && code <= 40)) {
																				return true;
																			} else {
																				return false;
																			}
																		} else {
																			return true;
																		}
																	}, onChange(newv, oldv) {
																		if (newv != "") {
																			$$("S3HttpEndpoint").setValue(domain + ":" + newv)
																		}
																	}
																}
															},
															{ view: "text", id: "S3HttpEndpoint", label: "HTTP Endpoint", labelWidth: labelWidth - 15, readonly: true, inputWidth: width - 15, },
															{ height: 15 },
															{
																view: "text", id: "S3HttpsPort", label: "HTTPS Port", labelWidth: labelWidth - 15, inputWidth: width - 15, on: {
																	onKeyPress: function (code, e) {
																		// allow only numbers and backspace, tab, enter, delete, arrows
																		if (code < 48 || code > 57) {
																			if (code == 8 || code == 9 || code == 13 || code == 46 || (code >= 37 && code <= 40)) {
																				return true;
																			} else {
																				return false;
																			}
																		} else {
																			return true;
																		}
																	}, onChange(newv, oldv) {
																		if (newv != "") {
																			$$("S3HttpsEndpoint").setValue(domain + ":" + newv)
																		}
																	}
																}
															},
															{ view: "text", id: "S3HttpsEndpoint", label: "HTTPS Endpoint", labelWidth: labelWidth - 15, readonly: true, inputWidth: width - 15, },
														]
													},
													{ height: 15 },
													{ view: "label", label: "S3 Service Storage", labelWidth: labelWidth, inputWidth: width, },
													{
														padding: {
															left: 15, right: 0, top: 0, bottom: 0
														},
														rows: [
															{
																view: "richselect", id: "S3StoragePools", label: "Storage Pool", name: "pool", labelWidth: labelWidth - 15, inputWidth: width - 15, on: {
																	onChange: function (newv, oldv) {
																		if (newv != "" && !existingConfig) {
																			var pool_id = this.getValue()

																			// get dataset list
																			webix.ajax().get("/api/storage/pools/" + pool_id + "/filesystems").then(function (data) {
																				datasetInformation = data.json()

																				var datasets = datasetInformation.map(function (dataset) {
																					return { id: dataset.id, value: dataset.name }
																				})

																				$$("S3Dataset").define("options", datasets)
																				$$("S3Dataset").refresh()
																			})
																		}
																	}
																}, invalidMessage: "Cannot be empty"
															},
															{
																view: "richselect", id: "S3Dataset", label: "Dataset", name: "dataset", labelWidth: labelWidth - 15, inputWidth: width - 15, on: {
																	onChange(newv, oldv) {
																		if (newv != "") {

																		}
																	}
																}, invalidMessage: "Cannot be empty"
															},
														]
													},
													{ height: 30 },
													{
														view: "accordion",
														multi: true,
														rows: [
															{
																header: "<span class='advancedSettings'>Advanced Settings</span>",
																id: "smbAdvancedSettingsAccordion",
																borderless: true, collapsed: true,
																css: "advancedSettingsAccordion",
																width: width,
																body: {
																	view: "form",
																	padding: 0,
																	autoheight: true,
																	elements: [
																		{
																			padding: {
																				top: 5, left: 20, right: 0, bottom: 0
																			},
																			cols: [
																				{
																					rows: [
																						{ view: "text", id: "S3MaxThreads", label: "Max Threads", labelWidth: labelWidth - 20, inputWidth: width - 20, },
																						{ view: "text", id: "S3MaxIdleTimeout", label: "Max Idle Timeout", labelWidth: labelWidth - 20, inputWidth: width - 20, },
																						{ view: "text", id: "S3MaxFileSize", label: "Max File Size", labelWidth: labelWidth - 20, inputWidth: width - 20, },
																						{ view: "text", id: "S3MaxTimeSkew", label: "Max Time Skew", labelWidth: labelWidth - 20, inputWidth: width - 20, },
																					]
																				},
																			]
																		},
																	]
																}
															},
														]
													},
													{
														height: 10
													},
													{
														view: "toolbar",
														borderless: true,
														elements: [
															{
																view: "button", value: "Apply", width: 70, css: "new_style_primary", click: function () {
																	var json_s3 = {
																		"dataset_ref_id": $$("S3Dataset").getValue(),
																		"enable": $$("S3EnableSwitch").getValue() == 1 ? "y" : "n",
																		"http_port": $$("S3HttpPort").getValue() * 1,
																		"https_port": $$("S3HttpsPort").getValue() * 1,
																		"interface_name": $$("S3NetworkInterfaces").getValue() == "Allow All Interfaces" ? "" : $$("S3NetworkInterfaces").getValue(),
																		"max_threads": $$("S3MaxThreads").getValue() * 1,
																		"max_idle_timeout": $$("S3MaxIdleTimeout").getValue() * 1,
																		"max_file_size": $$("S3MaxFileSize").getValue() * 1,
																		"max_time_skew": $$("S3MaxTimeSkew").getValue() * 1,
																	}

																	webix.ajax().post("/api/s3/configuration", JSON.stringify(json_s3)).then(function (data) {
																		webix.message({ type: "success", text: data.json(), expire: 10000 })
																	}).fail((xhr) => {
																		ajaxFail(xhr)
																	})
																}
															}
														]
													},
												]
											},
											{}
										]
									}
								],
							rules: {
								"pool": webix.rules.isNotEmpty,
								"dataset": webix.rules.isNotEmpty,
							}
						}
					]
				},
			]
		}
	}
	init() {
		webix.ajax().get("/api/network/dns").then((data) => {
			var managementInterfaceData = data.json()
			// add "Allow All Interfaces" to the beginning of the list of interfaces

			managementInterfaceData.interfaces.unshift("Allow All Interfaces")

			// all available interfaces
			$$("S3NetworkInterfaces").define("options", managementInterfaceData.interfaces)
		})

		if (!existingConfig) {
			webix.ajax().get("/api/storage/pools").then(function (data) {
				poolInformation = data.json()
				var pools = poolInformation.map(function (pool) {
					return { id: pool.id, value: pool.name }
				})

				$$("S3StoragePools").define("options", pools)
			})
		}

		webix.ajax().get("/api/s3/configuration").then(function (data) {
			if (data.dataset_ref_id) {
				existingConfig = true
			}

			if (existingConfig) {
				// set pool list to read only
				$$("S3StoragePools").define("readonly", true)
				$$("S3StoragePools").refresh()

				// set dataset list to read only
				$$("S3Dataset").define("readonly", true)
				$$("S3Dataset").refresh()
			}

			var s3Config = data.json()

			$$("S3EnableSwitch").setValue(s3Config.enable == "y" ? 1 : 0)
			$$("S3NetworkInterfaces").setValue(!s3Config.interface_name ? "Allow All Interfaces" : s3Config.interface_name)
			$$("S3HttpPort").setValue(s3Config.http_port)
			$$("S3HttpsPort").setValue(s3Config.https_port)
			$$("S3Dataset").define("options", [{ id: s3Config.dataset_ref_id, value: s3Config.dataset_name }])
			$$("S3Dataset").setValue(s3Config.dataset_ref_id)
			$$("S3StoragePools").setValue(s3Config.pool_name)
			// $$("S3StoragePath").setValue(s3Config.storage_path)

			// Advanced Settings
			$$("S3MaxThreads").setValue(s3Config.max_threads)
			$$("S3MaxIdleTimeout").setValue(s3Config.max_idle_timeout)
			$$("S3MaxFileSize").setValue(s3Config.max_file_size)
			$$("S3MaxTimeSkew").setValue(s3Config.max_time_skew)
		})
	}
}