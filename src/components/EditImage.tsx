import React, { useState, useRef, useEffect } from "react";

function EditImage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(1);
  const [saturation, setSaturation] = useState<number>(1);
  const [sharpness, setSharpness] = useState<number>(0);
  const [filter, setFilter] = useState<string>("none");
  const [cvReady, setCvReady] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const checkOpenCV = setInterval(() => {
      if ((window as any).cv && (window as any).cv.imread) {
        clearInterval(checkOpenCV);
        setCvReady(true);
        console.log("✅ OpenCV is ready");
      }
    }, 100);
  }, []);

  const applyFilter = (cv: any, mat: any, filter: string) => {
    if (filter === "grayscale") {
      cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
      cv.cvtColor(mat, mat, cv.COLOR_GRAY2RGBA);
    }
  };

  const adjustSaturation = (cv: any, mat: any, saturation: number) => {
    if (saturation === 1) return;

    const hsv = new cv.Mat();
    cv.cvtColor(mat, hsv, cv.COLOR_RGBA2RGB);
    cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

    const channels = new cv.MatVector();
    cv.split(hsv, channels);

    const S = channels.get(1);
    S.convertTo(S, -1, saturation, 0);
    channels.set(1, S);

    cv.merge(channels, hsv);
    cv.cvtColor(hsv, mat, cv.COLOR_HSV2RGB);
    cv.cvtColor(mat, mat, cv.COLOR_RGB2RGBA);

    hsv.delete();
    S.delete();
    channels.delete();
  };

  const applySharpness = (cv: any, mat: any, sharpness: number) => {
    if (sharpness === 0) return;

    const blurred = new cv.Mat();
    const sharpened = new cv.Mat();
    const ksize = 3;
    const sigma = 1;

    cv.GaussianBlur(mat, blurred, new cv.Size(ksize, ksize), sigma, sigma);
    cv.addWeighted(mat, 1 + sharpness, blurred, -sharpness, 0, sharpened);
    sharpened.copyTo(mat);

    blurred.delete();
    sharpened.delete();
  };

  const processImage = (
    brightness: number,
    contrast: number,
    filter: string,
    saturation: number,
    sharpness: number
  ) => {
    const cv = (window as any).cv;
    const imgElement = document.getElementById(
      "hidden-image"
    ) as HTMLImageElement;
    const canvas = canvasRef.current;
    if (!imgElement || !canvas) return;

    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;

    const mat = cv.imread(imgElement);
    const result = new cv.Mat();

    const alpha = contrast;
    const beta = brightness;

    mat.convertTo(result, -1, alpha, beta);
    applyFilter(cv, result, filter);
    adjustSaturation(cv, result, saturation);
    applySharpness(cv, result, sharpness);

    cv.imshow(canvas, result);

    mat.delete();
    result.delete();
  };

  useEffect(() => {
    if (imageSrc && cvReady) {
      processImage(brightness, contrast, filter, saturation, sharpness);
    }
  }, [imageSrc, brightness, contrast, filter, saturation, sharpness, cvReady]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a valid image file.");
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "edited-image.png";
    link.click();
  };

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-12 col-md-6 text-center mb-4 mb-md-0">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="form-control mb-3"
            id="uploadImageButton"
          />

          {imageSrc && (
            <img
              id="hidden-image"
              src={imageSrc}
              alt="hidden"
              style={{ display: "none" }}
              crossOrigin="anonymous"
            />
          )}

          {!cvReady && <p>Loading OpenCV...</p>}

          {imageSrc && cvReady && (
            <canvas
              ref={canvasRef}
              style={{ width: "100%", maxWidth: "100%" }}
              className="border rounded shadow-sm"
            />
          )}
        </div>

        {imageSrc && cvReady && (
          <div className="col-12 col-md-6 d-flex flex-column gap-3">
            <div>
              <label htmlFor="filter" className="form-label fw-bold">
                Filter:
              </label>
              <select
                id="filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="form-select"
              >
                <option value="none">None</option>
                <option value="grayscale">Grayscale</option>
              </select>
            </div>

            <div>
              <label htmlFor="brightness" className="form-label fw-bold">
                Brightness: {brightness}
              </label>
              <input
                id="brightness"
                type="range"
                min="-100"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="form-range"
              />
            </div>

            <div>
              <label htmlFor="contrast" className="form-label fw-bold">
                Contrast: {contrast.toFixed(2)}
              </label>
              <input
                id="contrast"
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="form-range"
              />
            </div>

            <div>
              <label htmlFor="saturation" className="form-label fw-bold">
                Saturation: {saturation.toFixed(2)}
              </label>
              <input
                id="saturation"
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                className="form-range"
              />
            </div>

            <div>
              <label htmlFor="sharpness" className="form-label fw-bold">
                Sharpness: {sharpness.toFixed(2)}
              </label>
              <input
                id="sharpness"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={sharpness}
                onChange={(e) => setSharpness(Number(e.target.value))}
                className="form-range"
              />
            </div>

            <button
              onClick={handleDownload}
              className="btn btn-primary w-100 mt-2"
            >
              Download Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditImage;
