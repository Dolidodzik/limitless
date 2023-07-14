export const renderProgress = (progress, fileName) => {
    return (
        <div>
            <h3> Downloading file: {fileName} </h3>
            <h3>Progress: {progress}% </h3>
        </div>
    )
}