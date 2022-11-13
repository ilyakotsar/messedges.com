function setPublicKey() {
    let private_key = document.getElementById('set-private-key').value;
    if (private_key.length > 0) {
        const g = document.getElementById('g').value;
        const p = document.getElementById('p').value;
        let private_key_number = passwordToNumber(private_key);
        let public_key = bigInt(g).modPow(private_key_number, p).toString();
        const room_name = document.getElementById('room-name').value;
        const csrf_token = document.getElementById('csrf-token').value;
        axios({
            method: 'post',
            url: '/rooms/' + room_name,
            headers: {'X-CSRFToken': csrf_token},
            data: {
                public_key: public_key
            }
        })
        .then(function (response) {
            if (response.data['success'] == true) {
                window.location.replace('https://messedges.com/rooms/' + room_name);
            } else if (response.data['error'] == true) {
                alert('Error')
            }
        });
    }
}

function passwordToNumber(password) {
    let number = '';
    for (let i = 0; i < password.length; i++) {
        let char_code = password[i].charCodeAt();
        number += char_code.toString();
    }
    return number;
}

document.querySelector('#set-private-key').onkeyup = function(event) {
    if (event.keyCode == 13) {
        document.getElementById('set-public-key').click();
    }
}
