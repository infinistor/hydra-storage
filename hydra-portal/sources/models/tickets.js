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
export function getTickets(){
	return tickets;
}

const tickets = [
	{"id":1,"time":"1:36 PM","name":"Top margin in a popup window is smaller than the...","status":"Open"},
	{"id":2,"time":"6:32 PM","name":"Button text on mobile devices","status":"Pending"},
	{"id":3,"time":"2:18 AM","name":"Search pattern is ambiguous","status":"Complete"},
	{"id":4,"time":"1:00 PM","name":"Navigations problem in the left menu","status":"Open"},
	{"id":5,"time":"6:20 PM","name":"'Confirm' button styling","status":"Complete"},
	{"id":6,"time":"12:12 AM","name":"Links in the upper right menu","status":"Complete"},
	{"id":7,"time":"4:03 AM","name":"Menu thumbnails disappear when I click them","status":"Pending"},
	{"id":8,"time":"0:02 AM","name":"No ability to exit profile editing dialogue","status":"Open"},
	{"id":9,"time":"7:45 PM","name":"Document export is empty","status":"Open"},
	{"id":10,"time":"4:11 PM","name":"Button text in the right menu","status":"Open"},
	{"id":11,"time":"1:12 PM","name":"Search is not working properly","status":"Pending"},
	{"id":12,"time":"6:17 PM","name":"How do I define which column the sort was activated from?","status":"Complete"},
	{"id":13,"time":"10:46 AM","name":"How to apply fewer options of drop down menu for specific rows of datatable?","status":"Complete"},
	{"id":14,"time":"8:20 PM","name":"Prevent clearing CSS added to node after filterByAll() in datatable filter","status":"Complete"},
	{"id":15,"time":"11:16 AM","name":"Can each series in a line chart have its own dataCollection?","status":"Complete"},
	{"id":16,"time":"8:54 AM","name":"Labels in rangechart","status":"Pending"},
	{"id":17,"time":"7:36 AM","name":"onBlur event not working for MultiSelect","status":"Pending"},
	{"id":18,"time":"7:02 AM","name":"Datatable focus on first cell","status":"Open"},
	{"id":19,"time":"0:07 AM","name":"Binding Filters to each other","status":"Complete"},
	{"id":20,"time":"6:45 PM","name":"Error: [DOM] Found 7 elements with non-unique id","status":"Complete"},
	{"id":21,"time":"12:56 PM","name":"Datatable editing within multiview","status":"Open"},
	{"id":22,"time":"5:23 PM","name":"Dynamic load filtering doesnot work with custom request call to server","status":"Open"},
	{"id":23,"time":"7:41 PM","name":"Top margin in a popup window is smaller than the...","status":"Pending"},
	{"id":24,"time":"2:03 PM","name":"Button text on mobile devices","status":"Complete"},
	{"id":25,"time":"4:57 PM","name":"Search pattern is ambiguous","status":"Open"},
	{"id":26,"time":"4:00 PM","name":"Navigations problem in the left menu","status":"Pending"},
	{"id":27,"time":"7:20 PM","name":"'Confirm' button styling","status":"Open"},
	{"id":28,"time":"4:24 AM","name":"Links in the upper right menu","status":"Open"},
	{"id":29,"time":"3:35 AM","name":"Menu thumbnails disappear when I click them","status":"Open"},
	{"id":30,"time":"12:24 PM","name":"No ability to exit profile editing dialogue","status":"Complete"},
	{"id":31,"time":"0:07 AM","name":"Document export is empty","status":"Open"},
	{"id":32,"time":"2:17 AM","name":"Button text in the right menu","status":"Pending"},
	{"id":33,"time":"7:01 PM","name":"Search is not working properly","status":"Complete"},
	{"id":34,"time":"4:04 AM","name":"How do I define which column the sort was activated from?","status":"Open"},
	{"id":35,"time":"10:22 AM","name":"How to apply fewer options of drop down menu for specific rows of datatable?","status":"Pending"},
	{"id":36,"time":"2:00 PM","name":"Prevent clearing CSS added to node after filterByAll() in datatable filter","status":"Open"},
	{"id":37,"time":"8:36 PM","name":"Can each series in a line chart have its own dataCollection?","status":"Complete"},
	{"id":38,"time":"11:42 AM","name":"Labels in rangechart","status":"Open"},
	{"id":39,"time":"10:45 PM","name":"onBlur event not working for MultiSelect","status":"Pending"},
	{"id":40,"time":"4:53 AM","name":"Datatable focus on first cell","status":"Complete"},
	{"id":41,"time":"9:11 PM","name":"Binding Filters to each other","status":"Open"},
	{"id":42,"time":"6:55 PM","name":"Error: [DOM] Found 7 elements with non-unique id","status":"Complete"},
	{"id":43,"time":"10:19 PM","name":"Datatable editing within multiview","status":"Complete"},
	{"id":44,"time":"8:53 AM","name":"Dynamic load filtering doesnot work with custom request call to server","status":"Open"},
	{"id":45,"time":"11:28 AM","name":"Top margin in a popup window is smaller than the...","status":"Complete"},
	{"id":46,"time":"8:37 AM","name":"Button text on mobile devices","status":"Open"},
	{"id":47,"time":"2:13 AM","name":"Search pattern is ambiguous","status":"Complete"},
	{"id":48,"time":"1:07 AM","name":"Navigations problem in the left menu","status":"Pending"},
	{"id":49,"time":"2:46 PM","name":"'Confirm' button styling","status":"Complete"},
	{"id":50,"time":"0:25 AM","name":"Links in the upper right menu","status":"Pending"},
	{"id":51,"time":"6:15 AM","name":"Menu thumbnails disappear when I click them","status":"Complete"},
	{"id":52,"time":"12:26 AM","name":"No ability to exit profile editing dialogue","status":"Complete"},
	{"id":53,"time":"7:10 PM","name":"Document export is empty","status":"Complete"},
	{"id":54,"time":"10:40 AM","name":"Button text in the right menu","status":"Complete"},
	{"id":55,"time":"6:02 PM","name":"Search is not working properly","status":"Complete"},
	{"id":56,"time":"12:22 AM","name":"How do I define which column the sort was activated from?","status":"Complete"},
	{"id":57,"time":"4:52 AM","name":"How to apply fewer options of drop down menu for specific rows of datatable?","status":"Open"},
	{"id":58,"time":"0:08 PM","name":"Prevent clearing CSS added to node after filterByAll() in datatable filter","status":"Pending"},
	{"id":59,"time":"9:44 AM","name":"Can each series in a line chart have its own dataCollection?","status":"Complete"},
	{"id":60,"time":"9:21 PM","name":"Labels in rangechart","status":"Complete"},
	{"id":61,"time":"6:15 PM","name":"onBlur event not working for MultiSelect","status":"Open"},
	{"id":62,"time":"1:18 AM","name":"Datatable focus on first cell","status":"Complete"},
	{"id":63,"time":"4:30 AM","name":"Binding Filters to each other","status":"Open"},
	{"id":64,"time":"12:35 AM","name":"Error: [DOM] Found 7 elements with non-unique id","status":"Complete"},
	{"id":65,"time":"9:29 AM","name":"Datatable editing within multiview","status":"Complete"},
	{"id":66,"time":"9:14 AM","name":"Dynamic load filtering doesnot work with custom request call to server","status":"Complete"}
];