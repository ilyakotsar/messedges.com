function getParameters() {
    let room_name = document.getElementsByName('room-name')[0].value;
    let csrf_token = document.getElementsByName('csrfmiddlewaretoken')[0].value;
    axios({
        method: 'post',
        url: '/rooms/' + room_name,
        headers: {
            'X-CSRFToken': csrf_token
        },
        data: {
            parameters: true
        }
    }).then(function (response) {
        document.getElementById('g').value = response.data['g'];
        document.getElementById('p').value = response.data['p'];
    });
}

function createPublicKey() {
    let private_key = document.getElementById('private-key').value;
    if (private_key.length > 9) {
        let g = document.getElementById('g').value;
        let p = document.getElementById('p').value;
        let private_key_number = passwordToNumber(private_key);
        let public_key = bigInt(g).modPow(private_key_number, p).toString();
        document.getElementById('public-key').value = public_key;
        document.getElementById('private-key').value = '';
        document.getElementById('private-key-length').innerHTML = '';
    } else {
        document.getElementById('public-key').value = '';
    }
}

function setPublicKey() {
    let public_key = document.getElementById('public-key').value;
    if (public_key.length > 4990) {
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

document.querySelector('#private-key').onkeyup = function(event) {
    if (event.keyCode == 13) {
        document.getElementById('create-public-key').click();
    }
}

getParameters();
