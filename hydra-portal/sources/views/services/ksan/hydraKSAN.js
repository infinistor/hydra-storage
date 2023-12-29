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
import { getStatusUI } from "../../../functions/getStatusUI";

var poolInformation
var datasetInformation
const KsanAgentActive = "KsanAgentActive";
const KsanGWActive = "KsanGWActive";
const KsanOSDActive = "KsanOSDActive";

const KsanEnableSwitch = "KsanEnableSwitch";

const Endpoint = "Endpoint";
const SecureEndpoint = "SecureEndpoint";
const Logging = "Logging";
const JettyMaxThreads = "JettyMaxThreads";
const JettyMaxIdleTimeout = "JettyMaxIdleTimeout";
const KsanMaxFileSize = "KsanMaxFileSize";
const KsanMaxTimeSkew = "KsanMaxTimeSkew";

const KsanStoragePools = "KsanStoragePools";
const KsanDataset = "KsanDataset";
const KsanLIfecycleDays = "KsanLIfecycleDays";
const KsanDiskPools = "KsanDiskPools";

const KsanUserName = "KsanUserName";
const KsanAccessKey = "KsanAccessKey";
const KsanSecretKey = "KsanSecretKey";

var existingConfig = false
export default class hydraKSAN extends JetView {
	config() {
		const labelWidth = 250
		const width = 600

		return {
			id: "hydraKSAN",
			borderless: true,
			padding: 15,
			rows: [
				{
					type: "abslayout",
					paddingX: 15,
					borderless: true,
					cols: [
						{
							rows: [
								{
									view: "switch", id: KsanEnableSwitch, label: "Enable KSAN S3-Compatible Service", labelWidth: labelWidth, value: 0, on: {
										onChange: function (newV, oldV) {
											// if pool and dataset are not null, enable the button
											if ($$(KsanStoragePools).getValue() == "" || $$(KsanDataset).getValue() != "") {
												return false
											}
										}
									}
								},
								{
									padding: { left: 15, right: 0, top: 0, bottom: 0 },
									rows: [
										{ view: "label", id: KsanAgentActive, labelWidth: labelWidth - 15 },
										{ view: "label", id: KsanGWActive, labelWidth: labelWidth - 15 },
										{ view: "label", id: KsanOSDActive, labelWidth: labelWidth - 15 },
									]
								},
								{ view: "label", label: "KSAN GW Configuration", labelWidth: labelWidth, inputWidth: width, },
								{
									view: "form",
									id: "ksan_gw_form",
									padding: { left: 15, right: 0, top: 0, bottom: 0 },
									borderless: true,
									elements: [
										{ view: "text", label: "KSAN Service Endpoint", value: "Allow All Interfaces", labelWidth: labelWidth - 15, inputWidth: width - 15, readonly: true },
										{ view: "text", id: Endpoint, label: "HTTP Endpoint", labelWidth: labelWidth - 15, inputWidth: width - 15, readonly: true, },
										{ view: "text", id: SecureEndpoint, label: "HTTPS Endpoint", labelWidth: labelWidth - 15, inputWidth: width - 15, readonly: true, },
										// { view: "text", id: Logging, label: "Logging", labelWidth: labelWidth - 15, inputWidth: width - 15, readonly: true, },
										// { view: "text", id: JettyMaxThreads, label: "Max Threads", labelWidth: labelWidth - 15, inputWidth: width - 15, readonly: true },
										// { view: "text", id: JettyMaxIdleTimeout, label: "Max Idle Timeout", labelWidth: labelWidth - 15, inputWidth: width - 15, readonly: true },
										// { view: "text", id: KsanMaxFileSize, label: "Max File Size", labelWidth: labelWidth - 15, inputWidth: width - 15, readonly: true },
										// { view: "text", id: KsanMaxTimeSkew, label: "Max Time Skew", labelWidth: labelWidth - 15, inputWidth: width - 15, readonly: true },
									]
								},
								{ height: 15 },
								{ view: "label", label: "KSAN Service Storage", labelWidth: labelWidth, inputWidth: width, },
								{
									view: "form",
									id: "ksan_form",
									padding: { left: 15, right: 0, top: 0, bottom: 0 },
									borderless: true,
									elements: [
										{
											view: "richselect", id: KsanStoragePools, label: "Storage Pool", name: "pool", labelWidth: labelWidth - 15, inputWidth: width - 15, on: {
												onChange: function (newV, oldV) {
													if (newV != "" && !existingConfig) {
														var pool_id = this.getValue()

														// get dataset list
														webix.ajax().get("/api/storage/pools/" + pool_id + "/filesystems").then(function (data) {
															datasetInformation = data.json()

															var datasets = datasetInformation.map(function (dataset) {
																return { id: dataset.id, value: dataset.name }
															})

															$$(KsanDataset).define("options", datasets)
															$$(KsanDataset).refresh()
														})
													}
												}
											}, invalidMessage: "Cannot be empty"
										},
										{ view: "richselect", id: KsanDataset, label: "Dataset", name: "dataset", labelWidth: labelWidth - 15, inputWidth: width - 15 },
										{ view: "counter", id: KsanLIfecycleDays, label: "Lifecycle Days", name: "lifecycle", labelWidth: labelWidth - 15, inputWidth: width - 15, value: 7, min: 1, max: 365, step: 1 },
										{ view: "richselect", id: KsanDiskPools, label: "Lifecycle Target KSAN DiskPool", name: "pool", labelWidth: labelWidth - 15, inputWidth: width - 15, },
									],
									rules: {
										"pool": webix.rules.isNotEmpty,
										"dataset": webix.rules.isNotEmpty,
										"lifecycle": webix.rules.isNotEmpty,
									}
								},
								{ height: 15 },
								{
									view: "accordion",
									multi: true,
									rows: [
										{
											header: "<span class='advancedSettings'>KSAN User Credential</span>",
											id: "ksanUserAccordion",
											borderless: true,
											collapsed: true,
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
																	{ view: "text", id: KsanUserName, label: "User Name", value: "Allow All Interfaces", labelWidth: labelWidth - 20, inputWidth: width - 20, readonly: true },
																	{ view: "text", id: KsanAccessKey, label: "Access Key", value: "Allow All Interfaces", labelWidth: labelWidth - 20, inputWidth: width - 20, readonly: true },
																	{ view: "text", id: KsanSecretKey, label: "Secret Key", value: "Allow All Interfaces", labelWidth: labelWidth - 20, inputWidth: width - 20, readonly: true },
																]
															},
														]
													},
												]
											}
										},
									]
								},
								{ height: 30 },
								{
									view: "toolbar",
									borderless: true,
									elements: [
										{
											view: "button", value: "Apply", width: 70, css: "new_style_primary", click: function () {
												if (existingConfig) {
													webix.ajax().put("/api/ksan/configuration/" + $(KsanLIfecycleDays).getValue()).then(function (data) {
														webix.message({ type: "success", text: data.json(), expire: 10000 })
													}).fail((xhr) => {
														ajaxFail(xhr)
													})
												} else {
													var json_ksan = {
														"enable": $$(KsanEnableSwitch).getValue() == 1 ? "y" : "n",
														"archive_name": $$(KsanDiskPools).getValue(),
														"lifecycle_days": $$(KsanLIfecycleDays).getValue(),
														"dataset_ref_id": $$(KsanDataset).getValue()
													}

													webix.ajax().post("/api/ksan/configuration", JSON.stringify(json_ksan)).then(function (data) {
														webix.message({ type: "success", text: data.json(), expire: 10000 })
													}).fail((xhr) => {
														ajaxFail(xhr)
													})
												}
											}
										}
									]
								},
							]
						},
						{}
					]
				},
			]
		}
	}
	init() {
		webix.ajax().get("api/ksan/configuration/gw").then(function (data) {
			var ksanConfig = data.json()

			$$(Endpoint).setValue(ksanConfig.endpoint);
			$$(SecureEndpoint).setValue(ksanConfig.secure_endpoint);
			$$(Logging).setValue(ksanConfig.logging);
			$$(JettyMaxThreads).setValue(ksanConfig.jetty_max_threads);
			$$(JettyMaxIdleTimeout).setValue(ksanConfig.jetty_max_idle_timeout);
			$$(KsanMaxFileSize).setValue(ksanConfig.max_file_size);
			$$(KsanMaxTimeSkew).setValue(ksanConfig.max_timeskew);
		});

		webix.ajax().get("/api/ksan/diskpools").then(function (data) {
			var diskpools = data.json()
			var pools = diskpools.map(function (pool) {
				return { id: pool.Id, value: pool.Name }
			})

			$$(KsanDiskPools).define("options", pools)
			$$(KsanDiskPools).refresh()
		})

		webix.ajax().get("/api/ksan/active").then(function (data) {
			var ksanActive = data.json();

			$$(KsanAgentActive).setValue("KSAN Agent: " + getStatusUI(ksanActive.IsKsanAgentActive));
			$$(KsanGWActive).setValue("KSAN GW: " + getStatusUI(ksanActive.IsKsanGWActive));
			$$(KsanOSDActive).setValue("KSAN OSD: " + getStatusUI(ksanActive.IsKsanOSDActive));

			if (ksanActive.IsKsanAgentActive != true || ksanActive.IsKsanGWActive != true || ksanActive.IsKsanOSDActive != true) {
				$$(KsanEnableSwitch).disable();
			}
		});

		webix.ajax().get("/api/network/dns").then((data) => {
			var managementInterfaceData = data.json()
			// add "Allow All Interfaces" to the beginning of the list of interfaces

			managementInterfaceData.interfaces.unshift("Allow All Interfaces")

			// all available interfaces
			$$("KsanNetworkInterfaces").define("options", managementInterfaceData.interfaces)
		})
		webix.ajax().get("/api/ksan/configuration").then(function (data) {
			var s3Config = data.json()

			$$(KsanEnableSwitch).setValue(s3Config.enable == "y" ? 1 : 0)
			$$(KsanDataset).setValue(s3Config.dataset_name)
			$$(KsanDataset).define("readonly", true)
			$$(KsanDataset).refresh()
			$$(KsanStoragePools).setValue(s3Config.pool_name)
			$$(KsanStoragePools).define("readonly", true)
			$$(KsanStoragePools).refresh()
			$$(KsanLIfecycleDays).setValue(s3Config.lifecycle_days)
			$$(KsanDiskPools).setValue(s3Config.archive_name)
			$$(KsanDiskPools).define("readonly", true)
			$$(KsanDiskPools).refresh()
			$$(KsanUserName).setValue(s3Config.user_name)
			$$(KsanAccessKey).setValue(s3Config.access_key)
			$$(KsanSecretKey).setValue(s3Config.secret_key)
			existingConfig = true
		})

		if (!existingConfig) {
			webix.ajax().get("/api/storage/pools").then(function (data) {
				poolInformation = data.json()
				var pools = poolInformation.map(function (pool) {
					return { id: pool.id, value: pool.name }
				})

				$$(KsanStoragePools).define("options", pools)
			})
		}
	}
}