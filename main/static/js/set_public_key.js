function setPublicKey() {
    let private_key = document.getElementById('set-private-key').value;
    if (private_key.length > 0) {
        let g = document.getElementsByName('g')[0].value;
        let p = document.getElementsByName('p')[0].value;
        let private_key_number = passwordToNumber(private_key);
        let public_key = bigInt(g).modPow(private_key_number, p).toString();
        let room_name = document.getElementsByName('room-name')[0].value;
        let csrf_token = document.getElementsByName('csrfmiddlewaretoken')[0].value;
        axios({
            method: 'post',
            url: '/rooms/' + room_name,
            headers: {
                'X-CSRFToken': csrf_token
            },
            data: {
                public_key: public_key
            }
        }).then(function (response) {
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
