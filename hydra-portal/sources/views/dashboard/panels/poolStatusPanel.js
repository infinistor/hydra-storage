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

import { getTimeInterval } from "../../../functions/timeIntervalForDashboard";
import { ajaxFail } from "../../../functions/ajaxFail";

export default class PoolStatusPanel extends JetView {
	constructor(app, name, data) {
        super(app);
        this._componentData = data;
        this._timer = null;
    }
    config() {
		return {
			view: "toolbar",
			elements: [
				{
                    padding: {
                        left: 5, right: 0, top: 0, bottom: 0
                    },
					rows: [
						{
							view: "label", localId: "poolName"
						},
                        {
                            padding: {
                                top: 2, bottom: 0, left: 0, right: 0
                            },
                            cols: [
                                {
                                    width: 150,
                                    rows: [
                                        {
                                            padding: {
                                                bottom: 5, top: 0, left: 0, right: 0
                                            },
                                            rows: [
                                                {
							                        view: "label", align: "left", localId: "health", height: 22
                                                },
                                                {
                                                    view: "label", align: "left", localId: "health_label", height: 17
                                                }
                                            ]
                                        },
                                        {
                                            cols: [
                                                {
                                                    view: "chart",
                                                    donutInnerText: (data, total) => {
                                                    return "<span style='font-size:18px'>"+data[0].percent+"%</span>";
                                                    },
                                                    localId: "chart",
                                                    type:"donut",
                                                    innerRadius:30,
                                                    radius: 40, 
                                                    value:"#percent#",  
                                                    color:"#color#",
                                                    borderless: true,
                                                    width: 120,
                                                    shadow: 0
                                                },
                                                {}
                                            ]
                                        },
                                    ]
                                },
                                {
                                    rows: [
                                        {
                                            padding: {
                                                bottom: 5, top: 0, left: 0, right: 0
                                            },
                                            rows: [
                                                {
							                        view: "label", align: "left", localId: "configuration", height: 22
                                                },
                                                {
                                                    view: "label", align: "left", label: `<span class="dashboard-panel-gray">Redundancy</span>`, height: 17
                                                }
                                            ]
                                        },
                                        {
                                            padding: {
                                                bottom: 5, top: 0, left: 0, right: 0
                                            },
                                            rows: [
                                                {
                                                    view: "label", align: "left", localId: "size", height: 22
                                                },
                                                {
                                                    view: "label", align: "left", label: `<span class="dashboard-panel-gray">Total Size</span>`, height: 17
                                                }
                                            ]
                                        },
                                        {
                                            padding: {
                                                bottom: 5, top: 0, left: 0, right: 0
                                            },
                                            rows: [
                                                {
                                                    view: "label", align: "left", localId: "alloc", height: 22
                                                },
                                                {
                                                    view: "label", align: "left", label: `<span class="dashboard-panel-gray">Allocated Size</span>`, height: 17
                                                }
                                            ]
                                        },
                                        {
                                            padding: {
                                                bottom: 5, top: 0, left: 0, right: 0
                                            },
                                            rows: [
                                                {
                                                    view: "label", align: "left", localId: "free", height: 22
                                                },
                                                {
                                                    view: "label", align: "left", label: `<span class="dashboard-panel-gray">Free Size</span>`, height: 17
                                                }
                                            ]
                                        },
                                        {
                                            padding: {
                                                bottom: 10, top: 0, left: 0, right: 0
                                            },
                                            rows: [
                                                {
                                                    view: "label", align: "left", localId: "available", height: 22
                                                },
                                                {
                                                    view: "label", align: "left", label: `<span class="dashboard-panel-gray">Available Size(User)</span>`, height: 17
                                                }
                                            ]
                                        },
                                    ]
                                }
                            ]
                        },
					]
				}
						
			]
		}
	}
    init() {
        var _self = this;
        var data = this._componentData;
        this.parseData(data)
        
		var reloadData = () => this.reloadData(data);
		this.startPeriodicRequest(_self, reloadData);
	}
	startPeriodicRequest(self, reloadData) {
		reloadData();
		
		self._timer = setTimeout(() => {
            this.startPeriodicRequest(self, reloadData);
		}, getTimeInterval());
	}
    destroy() {
		clearTimeout(this._timer);
	}
    reloadData(data) {
        webix.ajax().get("/api/storage/pools/" + data.id).then((response) => {
            var response = response.json();
            this.parseData(response)
        }).fail((xhr) => {
			ajaxFail(xhr)
		})
    }	
	parseData(data) {
        this._componentData = data;
		// data -> name, health, configuration, size, alloc, free, available
        this.$$("poolName").setValue("<span style='font-size: 14px; color: #475466;'>Storage - " + data.name.toUpperCase() + "</span>");
        
        if(data.health == "ONLINE") {
            this.$$("health").setValue("<span class='dashboard-panel-green dashboard-panel-pool'>" + data.health + "</span>");
            this.$$("health_label").setValue("<span class='dashboard-panel-green' style='font-weight: 400;'>State</span>");
        } else {
            this.$$("health").setValue("<span class='dashboard-panel-red dashboard-panel-pool'>" + data.health + "</span>");
            this.$$("health_label").setValue("<span class='dashboard-panel-red' style='font-weight: 400;'>State</span>");
        }
        
        if(data.configuration == "raidz") {
            this.$$("configuration").setValue("<span class='dashboard-panel-pool'>RAID5</span>");
        } else if(data.configuration == "mirror") {
            this.$$("configuration").setValue("<span class='dashboard-panel-pool'>MIRROR</span>");
        } else if(data.configuration == "single") {
            this.$$("configuration").setValue("<span class='dashboard-panel-pool'>SINGLE</span>");
        } else if(data.configuration == "raidz2") {
            this.$$("configuration").setValue("<span class='dashboard-panel-pool'>RAID6</span>");
        }
        
        this.$$("size").setValue("<span class='dashboard-panel-pool'>" + data.size.replace("K", "KiB").replace("M", "MiB").replace("G", "GiB").replace("T", "TiB").replace("P", "PiB") + "</span>");
        this.$$("alloc").setValue("<span class='dashboard-panel-pool'>" + data.alloc.replace("K", "KiB").replace("M", "MiB").replace("G", "GiB").replace("T", "TiB").replace("P", "PiB") + "</span>");
        this.$$("free").setValue("<span class='dashboard-panel-pool'>" + data.free.replace("K", "KiB").replace("M", "MiB").replace("G", "GiB").replace("T", "TiB").replace("P", "PiB") + "</span>");
        this.$$("available").setValue("<span class='dashboard-panel-pool'>" + data.available.replace("K", "KiB").replace("M", "MiB").replace("G", "GiB").replace("T", "TiB").replace("P", "PiB") + "</span>");
        
        var chartData =  [
            { percent:data.available_and_allocated_ratio, color: "#00c900" },
            { percent:100-data.available_and_allocated_ratio,  color: "#D9D8D7" },
        ]
        
        this.$$("chart").clearAll()
        this.$$("chart").parse(chartData)
	}
}