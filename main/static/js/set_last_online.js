function setLastOnline() {
    axios({
        method: 'get',
        url: '/set-last-online'
    }).then(function (response) {
    });
}

setLastOnline();
