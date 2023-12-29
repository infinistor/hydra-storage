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
import NFSAccordion from "./nfsAccordion";
import AddExport from "./windows/addExportWindow";
import EditExport from "./windows/editExportWindow";
import AddExportPermission from "./windows/addExportPermissionWindow";
import NFSContextMenu from "./context menu/nfsContextMenu";
import NFSPermissionContextMenu from "./context menu/nfsPermissionContextMenu";
import EditExportPermission from "./windows/editExportPermissionWindow";

import { searchColumnTemplateWithSubview } from "../../../functions/searchTemplate";
import { ajaxFail } from "../../../functions/ajaxFail";

var addExportWindow
var addExportPermissionWindow
export default class HydraSMB extends JetView {
	config() {
		var baseView = this
		var mainSearchValue = ""
		return {
			id: "hydraNFS",
			borderless: true,
			rows: [
				{ height: 15 },
				{
					type: "line", paddingX: 15,
					rows: [
						{
							header: "NFS Service & Global Configuration", id: "exports_config", borderless: true, collapsed: true, body: NFSAccordion
						},
						{ height: 15 },
						{
							rows: [
								{
									view: "toolbar", borderless: true, elements: [
										{ width: 3 },
										{ view: "label", label: "Exports" }
									]
								},
								{
									view: "toolbar", borderless: true, elements: [
										{
											view: "icon", icon: "mdi mdi-plus", css: "icon-button", click: () => {
												this.setParam("export_id", "", false)

												addExportWindow.showWindow()
											}
										},
										{
											view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: () => {
												$$("exports_datatable").clearAll()
												$$("exports_datatable").load("/api/nfs/exports")

												mainSearchValue = ""
												$$("mainExportSearch").setValue("")
											}
										},
										{},
										{
											view: "search", width: 250, placeholder: "Search", id: "mainExportSearch", on: {
												onTimedKeyPress: function () {
													$$("exports_datatable").filterByAll()
												}
											}
										},
									]
								},
								{
									view: "datatable",
									id: "exports_datatable",
									autoheight: true,
									borderless: true,
									headerRowHeight: 24,
									minRowHeight: 27,
									scroll: "y",
									subview: function (obj, target) {
										var subViewSearchValue = ""
										return webix.ui({
											padding: {
												left: 40, right: 0, top: 0, bottom: 0
											},
											rows: [
												{
													view: "toolbar", borderless: true, elements: [
														{
															view: "icon", icon: "mdi mdi-plus", css: "icon-button", click: () => {
																baseView.setParam("export_id", obj.id, false)
																baseView.setParam("permission_id", "", false)

																addExportPermissionWindow.showWindow()
															}
														},
														{
															view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: function () {
																var permissionsTable = this.getParentView().getParentView().getChildViews()[1]
																permissionsTable.clearAll()
																permissionsTable.load("/api/nfs/exports/" + obj.id + "/permissions").then(function () {
																	$$("exports_datatable").resizeSubView(obj.id)
																})

																var search = this.getParentView().getChildViews()[3]
																search.setValue("")
																subViewSearchValue = ""
															}
														},
														{},
														{
															view: "search", width: 250, placeholder: "Search", on: {
																onTimedKeyPress: function () {
																	var permissionsTable = this.getParentView().getParentView().getChildViews()[1]
																	permissionsTable.filterByAll()

																	$$("exports_datatable").resizeSubView(obj.id)
																}
															}
														},
													]
												},
												{
													view: "datatable",
													headerRowHeight: 24,
													minRowHeight: 27,
													autoheight: true,
													borderless: true,
													scroll: "y",
													columns: [
														{
															id: "enabled", header: "Enable", adjust: "header",
															template: function (obj) {
																var color = obj.enabled == "y" ? "#1CA1C1" : "#D9D9D9";
																return `<span style="font-size: 25px; color: ${color}; line-height: 31px;" class="webix_icon switcher mdi mdi-toggle-switch${obj.enabled == "y" ? "" : "-off"}"></span>`
															}
														},
														{
															id: "client", header: "Client IP", adjust: true, template(data, type, value) {
																return searchColumnTemplateWithSubview(data, type, value, "", subViewSearchValue)
															}
														},
														{
															id: "privilege", header: "Privilege", adjust: true, template: function (obj) {
																if (obj.privilege == "rw") {
																	// "Read/Write" in color green
																	return `<span style="color: #00C900;">Read/Write</span>`
																} else if (obj.privilege == "ro") {
																	// "Read Only" in color blue
																	return `<span style="color: #1CA1C1;">Read Only</span>`
																} else if (obj.privilege == "noaccess") {
																	// "No Access" in color red
																	return `<span style="color: red;">No Access</span>`
																}
															}
														},
														{
															id: "squash", header: "Squash", adjust: true, template: function (obj) {
																if (obj.squash == "no_mapping") {
																	return `No Mapping`
																} else if (obj.squash == "root_to_admin") {
																	return `Root to Admin`
																} else if (obj.squash == "root_to_guest") {
																	return `Root to Guest`
																} else if (obj.squash == "all_to_admin") {
																	return `All Users to Admin`
																} else if (obj.squash == "all_to_guest") {
																	return `All Users to Guest`
																}
															}
														},
														{
															id: "async", header: "Async", adjust: true, template: function (obj) {
																if (obj.async == "y") {
																	return `Yes`
																} else {
																	return `No`
																}
															}
														},
														{
															id: "comment", header: "Comment", fillspace: true, template(data, type, value) {
																return searchColumnTemplateWithSubview(data, type, value, "", subViewSearchValue)
															}
														},
														{
															id: "settings", header: "", adjust: "data",
															template: function () {
																return `<button type="button" class="hoverButton webix_icon_button">
                                                                        <span class="webix_icon mdi mdi-wrench"></span>
                                                                    </button>`
															}
														},
													],
													url: "/api/nfs/exports/" + obj.id + "/permissions",
													ready: function () {
														// register filter
														var subviewSearch = this.getParentView().getChildViews()[0].getChildViews()[3]

														this.registerFilter(
															subviewSearch,
															{
																columnId: "any",
																compare: function (value, filter, item) {
																	filter = filter.toLowerCase()
																	var client = item.client.toString().toLowerCase()
																	var comment = item.comment ? item.comment.toString().toLowerCase() : ""

																	var any = client + comment
																	if (any.indexOf(filter) != -1) {
																		return true
																	}
																	return false
																},
															},
															{
																getValue: function (node) {
																	return node.getValue();
																},
																setValue: function (node, value) {
																	node.setValue(value);
																}
															}
														)
													},
													onClick: {
														switcher: function (e, id) {
															var item = this.getItem(id);
															var newEnabled = item.enabled == 'y' ? 'n' : 'y';
															this.updateItem(id, { enabled: newEnabled });

															webix.ajax().put("/api/nfs/exports/permissions/" + item.id + "/toggle")
														},
														hoverButton: function (e, id, target) {
															var id = this.getItem(id).id

															baseView.setParam("export_id", obj.id, false)
															baseView.setParam("permission_id", id, false)

															$$("nfs_permission_context_menu").show(target)
														}
													},
													on: {
														onBeforeFilter: function (column, value) {
															if (column == "any") {
																subViewSearchValue = value
															}
														},
														onAfterLoad: function () {
															var noPermissionsLabel = this.getParentView().getChildViews()[2].getChildViews()[1]

															if (this.count() == 0) {
																this.hide()
																noPermissionsLabel.show()
															} else {
																this.show()
																noPermissionsLabel.hide()
															}
														},
													}
												},
												{
													cols: [
														{},
														{
															view: "label", label: "No permissions granted", align: "center", inputWidth: "auto", hidden: true
														},
														{}
													]
												}
											]
										}, target);
									},
									columns: [
										{ id: "subrow", header: "", template: "{common.subrow()}", adjust: true },
										{
											id: "enabled", header: "Enable", adjust: "header",
											template: function (obj) {
												var color = obj.enabled == "y" ? "#1CA1C1" : "#D9D9D9";
												return `<span style="font-size: 25px; color: ${color}; line-height: 31px;" class="webix_icon switcher mdi mdi-toggle-switch${obj.enabled == "y" ? "" : "-off"}"></span>`
											}
										},
										{
											id: "export_name", header: "Share ID", adjust: true, template(data, type, value) {
												return searchColumnTemplateWithSubview(data, type, value, mainSearchValue, "")
											}
										},
										{
											id: "dataset_path", header: "Filesystem (or Dataset)", adjust: true, template(data, type, value) {
												return searchColumnTemplateWithSubview(data, type, value, mainSearchValue, "")
											}
										},
										{
											id: "comment", header: "Comment", fillspace: true, template(data, type, value) {
												return searchColumnTemplateWithSubview(data, type, value, mainSearchValue, "")
											}
										},
										{
											id: "delete", header: "", adjust: "data",
											template: function () {
												return `<button type="button" class="hoverButton webix_icon_button">
                                                        <span class="webix_icon mdi mdi-wrench"></span>
                                                    </button>`
											}
										},
									],
									onClick: {
										switcher: function (e, id) {
											var item = this.getItem(id);
											webix.ajax().put("/api/nfs/exports/" + item.id + "/toggle").then(() => {
												var newEnable = item.enabled == 'y' ? 'n' : 'y';
												this.updateItem(id, { enabled: newEnable });
											}).fail(ajaxFail)
										},
										hoverButton: (e, id, target) => {
											var item = $$("exports_datatable").getItem(id)
											baseView.setParam("export_id", item.id, false)
											$$("nfs_context_menu").show(target)
										}
									},
									url: "/api/nfs/exports",
									on: {
										onSubViewCreate: function (view, item) {
											// resize the subview when the data is loaded
											var permissionsTable = view.getChildViews()[1]

											permissionsTable.waitData.then(() => {
												this.resizeSubView(item.id)
											})
										},
										onBeforeFilter(column, value) {
											if (column == "any") {
												mainSearchValue = value
											}
										},
										onAfterLoad: function () {
											if (this.count() == 0) {
												this.hide()
												$$("noExportsLabel").show()
											} else {
												this.show()
												$$("noExportsLabel").hide()
											}
										}
									}
								},
								{
									view: "toolbar",
									borderless: true,
									hidden: true,
									id: "noExportsLabel",
									elements: [
										{
											view: "label", label: "No exports found", align: "center", inputWidth: "auto", css: "header_label"
										},
									]
								}
							]
						}
					]
				},
			]
		}
	}
	init() {
		this.ui(NFSContextMenu)
		this.ui(NFSPermissionContextMenu)

		this.ui(EditExportPermission)
		this.ui(EditExport)

		addExportWindow = this.ui(AddExport)
		addExportPermissionWindow = this.ui(AddExportPermission)

		$$("exports_datatable").registerFilter(
			$$("mainExportSearch"),
			{
				columnId: "any", compare: function (value, filter, item) {
					var export_name = item.export_name.toLowerCase()
					var dataset_path = item.dataset_path.toLowerCase()
					var comment = item.comment.toLowerCase()
					var any = export_name + dataset_path + comment
					return any.indexOf(filter.toLowerCase()) !== -1;
				}
			},
			{
				getValue: function (node) {
					return node.getValue();
				},
				setValue: function (node, value) {
					node.setValue(value);
				}
			}
		)

		// check if the page was redirected from the dashboard
		var source = webix.storage.local.get("source")
		if (source == "dashboard") {
			webix.storage.local.remove("source")
			// expand exports_config
			$$("exports_config").expand()
		}
	}
}