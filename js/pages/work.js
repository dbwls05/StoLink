function openModal() {
    document.getElementById("save-modal").style.display = "flex";
}


function closeModal() {
    document.getElementById("save-modal").style.display = "none";
}


function saveContent(status) {

    console.log("저장 상태:", status);

    alert(status + " 상태로 저장되었습니다.");

    closeModal();
}