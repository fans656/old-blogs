/**
 * @author John
 */
$(function(){
	var searchText=document.getElementById("search-text");
	var searchBtn=document.getElementById("search-btn");
	var searchForm=document.getElementById("tag-form");
	var search=location.search;
	if(search.indexOf("search=1")>=0){
		if($.trim(ENV.TagName)){
			searchText.value=ENV.TagName;
		}
	}
	searchBtn.onclick=function(ev){
		if(!!$.trim(searchText.value)){
			document.getElementById("tag-form").submit();
		}
	};
	searchForm.onsubmit=function(ev){
		if(!$.trim(searchText.value)){
			if(ev){
				ev.preventDefault();
			}
			else{
				window.event.returnValue=false;
			}
			return;
		}
	}
});