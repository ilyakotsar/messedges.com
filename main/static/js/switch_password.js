function switchPassword(input_id, btn_id) {
    let password = document.getElementById(input_id);
    let btn = document.getElementById(btn_id);
    if (password.type == 'password') {
        password.type = 'text';
        btn.innerHTML = '<i class="fa-solid fa-eye fa-sm"></i>';
    } else {
        password.type = 'password';
        btn.innerHTML = '<i class="fa-solid fa-eye-slash fa-sm"></i>';
    }
}
