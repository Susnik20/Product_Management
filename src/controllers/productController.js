const productModel = require('../models/productModel')
const { uploadFile } = require('../middleWare/fileUpload');
const ObjectId = require('mongoose').Types.ObjectId


const isValid = function (val) {
    if (typeof val === "undefined" || val === null) return false;
    if (typeof val === "string" && val.trim().length === 0) return false;

    return true;
};

const isValidBody = function (val) {
    return Object.keys(val).length > 0;
};

const isValidImage = function (val) {
    let regEx = /.+\.(?:(jpg|gif|png|jpeg))/;
    let result = regEx.test(val);
    return result;
};

const isValidPrice = (val) => {
    if (/^[0-9\.]+$/.test(val))
        return true;
};

const isValidSize = function (val) {
    return ["S", "XS", "M", "X", "L", "XXL", "XL"].indexOf(...val) !== -1;
};

//--------->Create Product

const createProduct = async function (req, res) {
    try {
        let body = req.body;
        let productImage = req.files

        if (productImage.length == 0) {
            return res.status(400).send({ status: false, message: "Please upload the profile image." });
        } else if (productImage.length > 1) {
            return res.status(400).send({ status: false, message: "Please upload only one image." });
        }
        if (!isValidImage(productImage[0].originalname)) {
            return res.status(400).send({ status: false, message: "Please upload only image file" });
        }

        if (productImage && productImage.length > 0) {
            var uploadedFileURL = await uploadFile(productImage[0])
            productImage = uploadedFileURL

        } else {
            return res.status(400).send({ msg: "No file found" })
        }

        if (!isValidBody(body)) {
            return res.status(400).send({ status: false, message: "Invalid Request Parameter, Please Provide Another Details" });
        }

        let { title, description, price, currencyId, currencyFormat, availableSizes, style, installments, ...rest } = body;

        //validations
        if(Object.keys(rest).length>0) return res.status(400).send({status:false,message:'please put valid keys'})

        if (!isValid(title)) {
            return res.status(400).send({ status: false, message: "title is Required" })
        }
        if (!isValid(description)) {
            return res.status(400).send({ status: false, message: "description is Required" })
        }
        if (!isValid(price)) {
            return res.status(400).send({ status: false, message: "price is Required" })
        }
        if (!(/^[0-9.,]+$/.test(price))) return res.status(400).send({ status: false, message: 'please enter only numbers as input' })
        if (!isValid(currencyId)) {
            return res.status(400).send({ status: false, message: "currencyId is Required" })
        }
        if (currencyId !== "INR") return res.status(400).send({ status: false, message: "Only INR is accepted" })
        if (!isValid(currencyFormat)) {
            return res.status(400).send({ status: false, message: "currencyFormat is Required" })
        }
        if (currencyFormat !== "₹") return res.status(400).send({ status: false, message: "Only ₹ is accepted" })
        let getUserDetails = await productModel.findOne({ title: title })
        if (getUserDetails) {
            return res.status(404).send({ status: false, msg: `This title is already in use` })
        }


        let validProductData = { title, description, price, currencyId, productImage, currencyFormat }
        if (style) {
            if (!isValid(style)) {
                return res.status(400).send({ status: false, message: "style is Required" })
            }
            if (!(/^[A-Za-z ]+$/.test(style))) return res.status(400).send({ status: false, message: 'put a valid style' })
            validProductData.style = body.style
        }
        if (installments) {
            if (!isValid(installments)) {
                return res.status(400).send({ status: false, message: "installments is Required" })
            }
            if (!(/^[0-9]{1,2}$/.test(installments))) return res.status(400).send({ status: false, message: 'put a valid installment' })
            validProductData.installments = body.installments
        }
        if (availableSizes) {
            if (!isValid(availableSizes)) {
                return res.status(400).send({ status: false, message: "availableSizes is Required" })
            }
            availableSizes = availableSizes.split(',').map((x) => x.trim().toUpperCase())
            if (availableSizes.length == 0) return res.status(400).send({ status: false, message: 'availableSizes can not be empty' })

            let sizes = ["S", "XS", "M", "X", "L", "XXL", "XL"]
            for (let i = 0; i < availableSizes.length; i++) {
                if (sizes.includes(availableSizes[i]) == false) {
                    return res.status(400).send({ status: false, message: 'Please put valid size' })
                }
            }
            validProductData.availableSizes = availableSizes
        }
        if (!isValid(productImage)) return res.status(400).send({ status: false, message: "Product image is required" })

        let productdata = await productModel.create(validProductData);
        return res.status(201).send({ status: true, message: 'Product created Successfully', data: productdata });
    } catch (err) {
        console.log(err)
        return res.status(500).send(err.message)
    }
}


//----------> Get Product
const getProduct = async function (req, res) {
    try {
        let query = req.query
        let { size, name, priceGreaterThan, priceLessThan, priceSort, ...rest } = query;

        if(Object.keys(rest).length>0) return res.status(400).send({status:false,message:'please put valid keys'})

        let filterData = { isDeleted: false };
        let sort = {};

        if (size || size == '') {
            if (!isValid(size)) return res.status(400).send({ status: false, message: "Please enter size" })
            if (!isValidSize(size)) return res.status(400).send({ status: false, message: "Please enter valid size" })
            if (size.includes(",")) {
                size = size.split(",").map(x => x.trim());
                filterData.availableSizes = size
            }
            filterData.availableSizes = size;
        }

        if (name || name == '') {
            if (!isValid(name)) return res.status(400).send({ status: false, message: "Please enter name" })
            filterData.title = name;
        }

        if (priceGreaterThan || priceGreaterThan == '') {
            if (!isValid(priceGreaterThan)) return res.status(400).send({ status: false, message: "Please enter priceGreaterThan" })
            filterData.price = { $gte: priceGreaterThan };
        }

        if (priceLessThan || priceLessThan == '') {
            if (!isValid(priceLessThan)) return res.status(400).send({ status: false, message: "Please enter priceLessThan" })
            filterData.price = { $lte: priceLessThan };
        }

        if ((priceGreaterThan && priceLessThan)) filterData.price = { $gte: priceGreaterThan, $lte: priceLessThan }

        if (priceSort || priceSort == '') {
            if (!isValid(priceSort)) return res.status(400).send({ status: false, message: "Please enter priceSort" })
            if (priceSort === '1' || priceSort === '-1') {
                sort.price = Number(priceSort);
            } else {
                return res.status(400).send({ status: false, message: "Invalid request, priceSort accepts only 1 and -1 as value" })
            }
        }

        let allProducts = await productModel.find(filterData).sort(sort);
        if (allProducts.length == 0) return res.status(404).send({ status: false, message: "Product not found" })

        return res.status(200).send({ status: true, message: "Success", data: allProducts })
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}


//---------->Get Product by ID

const getProductById = async function (req, res) {
    try {
        let productId = req.params.productId
        if (!ObjectId.isValid(productId)) return res.status(400).send({ status: false, message: 'Please put a valid objectId' })
        let findData = await productModel.findOne({ isDeleted: false, _id: productId })
        if (!findData) return res.status(404).send({ status: false, message: 'No data found' })
        return res.status(200).send({ status: true, message: 'Success', data: findData })


    } catch (err) {
        return res.status(500).send(err.message)
    }
}

//--------->Update Product

const updateProductDetails = async function (req, res) {
    try {
        const productId = req.params.productId
        const files = req.files
        const updateData = req.body

        let { title, description, price, style, availableSizes, installments, isFreeShipping, ...rest } = updateData


        if (files && files.length > 0) {
            if (files.length > 1) {
                return res.status(400).send({ status: false, message: "Please upload only one image" });
            }
            if (!isValidImage(files[0].originalname)) {
                return res.status(400).send({ status: false, message: "Please upload only image file" });
            }
            var uploadedFileURL = await uploadFile(files[0])
            updateData.productImage = uploadedFileURL
        }
        
        if(Object.keys(rest).length>0) return res.status(400).send({status:false,message:'please put valid keys'})

        if (!ObjectId.isValid(productId)) return res.status(400).send({ status: false, msg: "invalid product Id" })

        if (!isValidBody(updateData)) {
            return res.status(400).send({ status: false, message: "Invalid Request Parameter, Please Provide Another Details" });
        }

        if (title != undefined) {
            if (!isValid(title)) return res.status(400).send({ status: false, message: "title is required" })
            if (await productModel.findOne({ title })) return res.status(400).send({ status: false, message: "the title is same as the present title of this product" })
        }
        if (description != undefined) {
            if (!isValid(description)) return res.status(400).send({ status: false, message: "description is required" })
        }
        if (price != undefined) {
            if (!isValid(price)) return res.status(400).send({ status: false, message: "price is required" })
            if (!isValidPrice(price)) return res.status(400).send({ status: false, message: "Please enter valid price, numbers only" })
        }

        if (style != undefined) {
            if (!isValid(style)) return res.status(400).send({ status: false, message: "style is required" })
            if (!(/^[A-Za-z ]+$/.test(style))) return res.status(400).send({ status: false, msg: 'please provide valid style' })
        }

        if (updateData.productImage != undefined) {
            if (!isValid(updateData.productImage)) return res.status(400).send({ status: false, message: "productImage is Required" })
        }

        if (availableSizes != undefined) {
            if (!isValid(availableSizes)) {
                return res.status(400).send({ status: false, message: "availableSizes is Required" })
            }
            availableSizes = availableSizes.split(',').map((x) => x.trim().toUpperCase())
            if (availableSizes.length == 0) return res.status(400).send({ status: false, message: 'availableSizes can not be empty' })

            let sizes = ["S", "XS", "M", "X", "L", "XXL", "XL"]
            //availableSizes = availableSizes.map((x) => x.trim())
            for (let i = 0; i < availableSizes.length; i++) {
                if (sizes.includes(availableSizes[i]) == false) {
                    return res.status(400).send({ status: false, message: 'Please put valid size' })
                }
            }
            updateData.availableSizes = availableSizes
        }

        if (installments != undefined) {
            if (!(/^[0-9]{1,2}$/.test(installments))) return res.status(400).send({ status: false, message: 'put a valid installment' })
        }
        if (isFreeShipping != undefined) {
            if (!isValid(isFreeShipping)) return res.status(400).send({ status: false, message: "isFreeShipping is required" })
            if (isFreeShipping !== ("true" || "false")) return res.status(400).send({ status: false, message: 'isFreeShipping must be a boolean value' })
        }

        const updateDetails = await productModel.findByIdAndUpdate({ _id: productId, isDeleted: false }, updateData, { new: true }).select({ __v: 0 })
        if (!updateDetails) return res.status(404).send({ status: false, message: 'No data found with this objectId' })
        return res.status(200).send({ status: true, message: "User profile updated successfully", data: updateDetails })
    }
    catch (err) {
        console.log(err)
        return res.status(500).send({ status: false, error: err.message })
    }
}

const deleteProducts = async function (req, res) {
    try {
        let productId = req.params.productId;
        if (!ObjectId.isValid(productId)) {
            return res.status(400).send({ status: false, message: "Please provide valid productId in params" })
        }
        let product = await productModel.findOneAndUpdate({ _id: productId, isDeleted: false }, { $set: { isDeleted: true, deletedAt: new Date() } });
        if (!product) {
            return res.status(404).send({ status: false, message: "Product does not exist" });
        }

        return res.status(200).send({ status: true, message: "Product deleted successfully" });

    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}



module.exports = { createProduct, getProduct, getProductById, updateProductDetails, deleteProducts }